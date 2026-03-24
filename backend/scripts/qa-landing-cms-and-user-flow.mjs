import 'dotenv/config';
import {
  API_BASE,
  extractItems,
  pollUntil,
  requestBuffer,
  requestJson,
  saveReport,
  settleOrder,
  uniqueEmail,
  uniquePhone,
} from './shared.mjs';

const ADMIN_USERNAME = process.env.SEED_SUPERADMIN_USERNAME || 'superadmin';
const ADMIN_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD || 'ChangeMeNow123!';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7ZfGQAAAAASUVORK5CYII=';

function requireOk(label, response) {
  if (!response?.ok) {
    throw new Error(`${label} failed with status ${response?.status}: ${JSON.stringify(response?.body)}`);
  }
  return response;
}

function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function adminLogin() {
  const response = await requestJson('/admin/login', {
    method: 'POST',
    body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  });
  requireOk('admin login', response);
  return response.data.token;
}

async function uploadTestImage(token) {
  const form = new FormData();
  form.append('file', new Blob([Buffer.from(PNG_BASE64, 'base64')], { type: 'image/png' }), 'qa-logo.png');
  form.append('category', 'branding');
  form.append('folder', 'content');
  form.append('prefix', 'qa-logo');
  form.append('name', 'QA Logo');
  form.append('registerInMedia', 'true');

  const response = await fetch(`${API_BASE}/upload/image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(`upload image failed with status ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload?.data || payload;
}

async function getCmsDomain(token, domainKey) {
  const response = await requestJson(`/landing/cms/${domainKey}`, { token });
  requireOk(`get cms domain ${domainKey}`, response);
  return response.data;
}

async function putCmsDomain(token, domainKey, value) {
  const response = await requestJson(`/landing/cms/${domainKey}`, {
    method: 'PUT',
    token,
    body: value,
  });
  requireOk(`update cms domain ${domainKey}`, response);
  return response.data;
}

async function main() {
  const stamp = Date.now();
  const report = {
    generatedAt: new Date().toISOString(),
    healthBefore: null,
    healthAfter: null,
    cms: {},
    publicPages: {},
    authAndTestFlow: {},
    cleanup: {},
  };

  const createdArticleIds = [];
  const createdMediaIds = [];
  let uploadedLogo = null;
  let originalDomains = null;

  report.healthBefore = await requestJson('/health');
  requireOk('health before', report.healthBefore);

  const adminToken = await adminLogin();

  const domainKeys = ['global', 'home', 'companyProfile', 'services', 'shop', 'privacyPolicy', 'navigation'];
  originalDomains = Object.fromEntries(
    await Promise.all(domainKeys.map(async (key) => [key, await getCmsDomain(adminToken, key)])),
  );

  try {
    const cmsSummaryBefore = await requestJson('/landing/cms/summary', { token: adminToken });
    const cmsStateBefore = await requestJson('/landing/cms/state', { token: adminToken });
    requireOk('cms summary before', cmsSummaryBefore);
    requireOk('cms state before', cmsStateBefore);

    report.cms.summaryBefore = cmsSummaryBefore.data;
    report.cms.stateKeysBefore = Object.keys(cmsStateBefore.data || {});

    uploadedLogo = await uploadTestImage(adminToken);
    requireCondition(!!uploadedLogo?.url, 'Upload logo tidak mengembalikan URL');
    if (uploadedLogo?.asset?.id) {
      createdMediaIds.push(uploadedLogo.asset.id);
    }

    const mediaListAfterUpload = await requestJson('/media', { token: adminToken });
    requireOk('media list after upload', mediaListAfterUpload);
    const uploadedAsset = extractItems(mediaListAfterUpload.body).find((item) => item.url === uploadedLogo.url);
    requireCondition(!!uploadedAsset, 'Logo upload belum masuk media library');

    const renamedMedia = await requestJson(`/media/${uploadedAsset.id}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        name: `QA Logo ${stamp}`,
        category: 'branding',
        url: uploadedAsset.url,
      },
    });
    requireOk('rename uploaded media', renamedMedia);
    report.cms.logoUpload = renamedMedia.data;

    const tempGlobal = {
      ...originalDomains.global,
      siteName: `NEWME QA ${stamp}`,
      tagline: 'Landing QA Runtime Check',
      logoUrl: uploadedLogo.url,
      whatsapp: '6281234567890',
      phone: '021-555000',
      email: `qa-${stamp}@newme.test`,
      address: `Jl. QA Landing ${stamp}`,
      socialLinks: [
        ...(Array.isArray(originalDomains.global.socialLinks) ? originalDomains.global.socialLinks : []),
        { platform: 'qa-linkedin', url: `https://example.com/${stamp}` },
      ],
    };
    await putCmsDomain(adminToken, 'global', tempGlobal);

    const tempHome = {
      ...originalDomains.home,
      hero: [
        {
          id: `hero-${stamp}`,
          subtitle: 'QA Hero',
          title: `Landing Runtime ${stamp}`,
          desc: 'Memastikan hero section dapat tersimpan dan tampil dari database.',
          image: uploadedLogo.url,
          ctaText: 'Mulai Tes',
          ctaLink: '/login',
        },
        ...(Array.isArray(originalDomains.home.hero) ? originalDomains.home.hero : []),
      ],
      about: {
        ...(originalDomains.home.about || {}),
        badge: 'QA',
        title: `Tentang NEWME ${stamp}`,
        description: 'Section about berhasil diubah saat QA runtime.',
        image: uploadedLogo.url,
      },
      testimonials: [
        {
          id: `testimonial-${stamp}`,
          name: 'QA Visitor',
          role: 'Runtime Check',
          text: 'Section testimonial tersimpan dari CMS.',
          avatar: uploadedLogo.url,
          rating: 5,
        },
        ...(Array.isArray(originalDomains.home.testimonials) ? originalDomains.home.testimonials : []),
      ],
      benefits: [
        {
          id: `benefit-${stamp}`,
          title: 'QA Benefit',
          description: 'Benefit QA aktif dari backend.',
          icon: 'shield',
        },
        ...(Array.isArray(originalDomains.home.benefits) ? originalDomains.home.benefits : []),
      ],
      activities: [
        {
          id: `activity-${stamp}`,
          title: 'QA Activity',
          date: new Date().toISOString().slice(0, 10),
          image: uploadedLogo.url,
          description: 'Activity QA tersimpan dari backend.',
        },
        ...(Array.isArray(originalDomains.home.activities) ? originalDomains.home.activities : []),
      ],
      finalCta: {
        ...(originalDomains.home.finalCta || {}),
        title: 'CTA QA Landing',
        subtitle: 'Verifikasi final CTA dari backend',
        ctaText: 'Masuk Sekarang',
        ctaLink: '/login',
      },
    };
    await putCmsDomain(adminToken, 'home', tempHome);

    const tempCompanyProfile = {
      ...originalDomains.companyProfile,
      description: `Profil perusahaan QA ${stamp}`,
      vision: `Visi QA ${stamp}`,
      mission: [`Misi QA ${stamp}`],
      teamMembers: [
        {
          id: `team-${stamp}`,
          name: 'QA Lead',
          role: 'Quality Assurance',
          image: uploadedLogo.url,
          bio: 'Data team member hasil QA runtime.',
        },
        ...(Array.isArray(originalDomains.companyProfile.teamMembers) ? originalDomains.companyProfile.teamMembers : []),
      ],
    };
    await putCmsDomain(adminToken, 'companyProfile', tempCompanyProfile);

    const qaServiceSlug = `qa-service-${stamp}`;
    const tempServices = {
      ...originalDomains.services,
      servicePages: [
        {
          id: `service-${stamp}`,
          slug: qaServiceSlug,
          title: 'QA Service',
          subtitle: 'Service detail runtime',
          heroImage: uploadedLogo.url,
          description: 'Halaman service QA dari CMS.',
          features: [{ title: 'QA Feature', desc: 'Feature tersimpan dari backend.' }],
          pricing: [{ name: 'QA Plan', price: 'Rp 0', features: ['QA Access'] }],
          enabled: true,
        },
        ...(Array.isArray(originalDomains.services.servicePages) ? originalDomains.services.servicePages : []),
      ],
    };
    await putCmsDomain(adminToken, 'services', tempServices);

    const tempShop = {
      ...originalDomains.shop,
      shopCategories: [
        {
          id: `shop-category-${stamp}`,
          name: 'QA Category',
          slug: `qa-category-${stamp}`,
        },
        ...(Array.isArray(originalDomains.shop.shopCategories) ? originalDomains.shop.shopCategories : []),
      ],
      products: [
        {
          id: `product-${stamp}`,
          name: 'QA Product',
          price: 12345,
          category: 'QA Category',
          image: uploadedLogo.url,
          badge: 'QA',
          desc: 'Produk QA dari CMS.',
          rating: 5,
          reviews: 1,
          stock: 9,
          enabled: true,
        },
        ...(Array.isArray(originalDomains.shop.products) ? originalDomains.shop.products : []),
      ],
    };
    await putCmsDomain(adminToken, 'shop', tempShop);

    const tempPrivacyPolicy = {
      ...originalDomains.privacyPolicy,
      lastUpdated: new Date().toISOString().slice(0, 10),
      sections: [
        {
          id: `privacy-${stamp}`,
          title: 'Kebijakan QA',
          content: 'Konten privacy policy hasil QA runtime.',
        },
        ...(Array.isArray(originalDomains.privacyPolicy.sections) ? originalDomains.privacyPolicy.sections : []),
      ],
    };
    await putCmsDomain(adminToken, 'privacyPolicy', tempPrivacyPolicy);

    const tempNavigation = {
      ...originalDomains.navigation,
      mainLinks: [
        { label: 'QA Link', href: `/qa-${stamp}` },
        ...(Array.isArray(originalDomains.navigation.mainLinks) ? originalDomains.navigation.mainLinks : []),
      ],
    };
    await putCmsDomain(adminToken, 'navigation', tempNavigation);

    const createdArticle = await requestJson('/articles', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Artikel QA ${stamp}`,
        slug: `artikel-qa-${stamp}`,
        excerpt: 'Artikel QA untuk verifikasi landing home.',
        category: 'qa',
        content: `Konten artikel QA ${stamp}`,
        featuredImage: uploadedLogo.url,
        isPublished: true,
      },
    });
    requireOk('create article', createdArticle);
    createdArticleIds.push(createdArticle.data.id);

    const updatedArticle = await requestJson(`/articles/${createdArticle.data.id}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        title: `Artikel QA Updated ${stamp}`,
        excerpt: 'Artikel QA telah diupdate.',
        content: `Konten update artikel QA ${stamp}`,
        featuredImage: uploadedLogo.url,
        isPublished: true,
      },
    });
    requireOk('update article', updatedArticle);

    const publicBootstrap = await requestJson('/landing/public/bootstrap');
    const publicHome = await requestJson('/landing/public/home');
    const publicCompanyProfile = await requestJson('/landing/public/company-profile');
    const publicServices = await requestJson('/landing/public/services');
    const publicServiceDetail = await requestJson(`/landing/public/services/${qaServiceSlug}`);
    const publicShop = await requestJson('/landing/public/shop');
    const publicPrivacy = await requestJson('/landing/public/privacy-policy');
    const publicContact = await requestJson('/landing/public/contact');
    const publicNavigation = await requestJson('/landing/public/navigation');
    const publicArticles = await requestJson('/articles');

    [
      ['public bootstrap', publicBootstrap],
      ['public home', publicHome],
      ['public company profile', publicCompanyProfile],
      ['public services', publicServices],
      ['public service detail', publicServiceDetail],
      ['public shop', publicShop],
      ['public privacy', publicPrivacy],
      ['public contact', publicContact],
      ['public navigation', publicNavigation],
      ['public articles', publicArticles],
    ].forEach(([label, response]) => requireOk(label, response));

    requireCondition(publicBootstrap.data.global.logoUrl === uploadedLogo.url, 'Logo global publik belum mengikuti upload CMS');
    requireCondition(publicHome.data.hero.some((item) => item.id === `hero-${stamp}`), 'Hero QA belum muncul di public home');
    requireCondition(publicCompanyProfile.data.companyProfile.teamMembers.some((item) => item.id === `team-${stamp}`), 'Team member QA belum muncul di company profile');
    requireCondition(publicServices.data.servicePages.some((item) => item.slug === qaServiceSlug), 'Service page QA belum muncul di services');
    requireCondition(publicServiceDetail.data.service.slug === qaServiceSlug, 'Detail service QA belum terbuka');
    requireCondition(publicShop.data.products.some((item) => item.id === `product-${stamp}`), 'Produk QA belum muncul di shop');
    requireCondition(publicPrivacy.data.privacyPolicy.sections.some((item) => item.id === `privacy-${stamp}`), 'Privacy policy QA belum muncul');
    requireCondition(publicNavigation.data.mainLinks.some((item) => item.href === `/qa-${stamp}`), 'Navigation QA belum muncul');
    requireCondition(
      extractItems(publicArticles.body).some((item) => item.id === createdArticle.data.id && item.title.includes('Updated')),
      'Artikel QA belum muncul di endpoint artikel publik',
    );
    requireCondition(
      publicHome.data.articles.some((item) => item.id === createdArticle.data.id),
      'Artikel QA belum muncul di landing home',
    );

    report.publicPages = {
      bootstrap: publicBootstrap.data,
      homeHeroCount: publicHome.data.hero.length,
      companyTeamCount: publicCompanyProfile.data.companyProfile.teamMembers.length,
      servicesCount: publicServices.data.servicePages.length,
      shopProductCount: publicShop.data.products.length,
      privacySectionCount: publicPrivacy.data.privacyPolicy.sections.length,
      navigationMainCount: publicNavigation.data.mainLinks.length,
      articleCount: extractItems(publicArticles.body).length,
    };

    const contactCreate = await requestJson('/contacts', {
      method: 'POST',
      body: {
        name: 'QA Contact',
        email: `contact-${stamp}@example.com`,
        message: 'Pesan QA untuk memverifikasi contact form.',
      },
    });
    requireOk('create contact message', contactCreate);

    const contactList = await requestJson('/contacts');
    requireOk('contact list', contactList);
    requireCondition(
      extractItems(contactList.body).some((item) => item.id === contactCreate.data.id),
      'Pesan contact belum masuk ke database',
    );

    const provinces = await requestJson('/landing/public/locations/provinces');
    requireOk('get provinces', provinces);
    const province = provinces.data[0];
    requireCondition(!!province?.id, 'Data province kosong');

    const cities = await requestJson(`/landing/public/locations/cities?provinceId=${encodeURIComponent(province.id)}`);
    requireOk('get cities', cities);
    const city = cities.data[0];
    requireCondition(!!city?.id, 'Data city kosong');

    const districts = await requestJson(`/landing/public/locations/districts?cityId=${encodeURIComponent(city.id)}`);
    requireOk('get districts', districts);
    const district = districts.data[0];
    requireCondition(!!district?.id, 'Data district kosong');

    const villages = await requestJson(`/landing/public/locations/villages?districtId=${encodeURIComponent(district.id)}`);
    requireOk('get villages', villages);
    const village = villages.data[0];
    requireCondition(!!village?.id, 'Data village kosong');

    const userEmail = uniqueEmail('landing-user', stamp, 1);
    const userPassword = 'Password123!';
    const userRegister = await requestJson('/auth/register', {
      method: 'POST',
      body: {
        email: userEmail,
        fullName: 'Landing QA User',
        password: userPassword,
        phone: uniquePhone('0812', stamp, 1),
        address: `Jl. QA User ${stamp}`,
        birthDate: '2003-09-29',
        province: province.name,
        city: city.name,
        district: district.name,
        village: village.name,
      },
    });
    requireOk('user register', userRegister);
    const userId = userRegister.data.user.id || userRegister.data.user._id;
    const userToken = userRegister.data.token;

    const userLogin = await requestJson('/auth/login', {
      method: 'POST',
      body: {
        email: userEmail,
        password: userPassword,
      },
    });
    requireOk('user login', userLogin);

    const userProfile = await requestJson('/auth/me', { token: userToken });
    requireOk('user profile', userProfile);
    requireCondition(userProfile.data.birthDate === '2003-09-29', 'Birth date user tidak tersimpan benar');
    requireCondition(userProfile.data.province === province.name, 'Province user tidak tersimpan benar');
    requireCondition(userProfile.data.city === city.name, 'City user tidak tersimpan benar');

    const adminUsers = await requestJson(`/users?search=${encodeURIComponent(userEmail)}`, { token: adminToken });
    requireOk('admin users list', adminUsers);
    requireCondition(
      extractItems(adminUsers.body).some((item) => item.email === userEmail),
      'User hasil register landing belum muncul di dashboard admin',
    );

    const snap = await requestJson('/user-payments/create-snap', {
      method: 'POST',
      token: userToken,
      body: {},
    });
    requireOk('create snap', snap);
    const snapData = snap.data?.data || snap.data;
    requireCondition(!!snapData?.orderId, 'Snap orderId tidak tersedia');

    const settled = await settleOrder(snapData.orderId, snapData.amount);
    requireOk('settle order', settled);

    const paidStatus = await pollUntil(`/user-payments/check-payment/${snapData.orderId}`, (response) => (
      ['settlement', 'capture', 'success'].includes(String(response.data?.status || '').toLowerCase())
    ), { token: userToken, attempts: 25, waitMs: 300 });
    requireCondition(
      ['settlement', 'capture', 'success'].includes(String(paidStatus.data?.status || '').toLowerCase()),
      'Status pembayaran user belum settle',
    );

    const userProfileAfterPayment = await pollUntil('/auth/me', (response) => (
      response.data?.paymentStatus === 'approved'
    ), { token: userToken, attempts: 25, waitMs: 300 });
    requireCondition(userProfileAfterPayment.data?.paymentStatus === 'approved', 'Payment status user belum approved');

    const coreQuestions = await requestJson('/personality-tests/core-premium/questions', { token: userToken });
    requireOk('get core premium questions', coreQuestions);
    const runtimeQuestions = coreQuestions.data?.questions || coreQuestions.data?.items || coreQuestions.data || [];
    requireCondition(Array.isArray(runtimeQuestions) && runtimeQuestions.length >= 31, 'Runtime core premium questions belum lengkap');

    const coreSubmit = await requestJson('/personality-tests/core-premium/submit', {
      method: 'POST',
      token: userToken,
      body: {
        tes_a: {
          q1: true,
          q2: true,
          q3: true,
          q4: false,
          q5: false,
          q6: false,
        },
        tes_b: {
          q1: 'B',
          q2: 'D',
          q3: 'C',
          q4: 'C',
          q5: 'E',
        },
        tes_c: {
          sense_air: [1, 4, 4, 4, 1],
          visual_kayu: [10, 7, 7, 10, 7],
          auditori_api: [4, 7, 7, 1, 7],
          reading_logam: [10, 4, 7, 4, 7],
          kinestetik_tanah: [1, 7, 7, 4, 1],
        },
      },
    });
    requireOk('submit core premium', coreSubmit);
    requireCondition(coreSubmit.data.coreScoring?.dominan_1_kode === 'iK(+)', 'Hasil core scoring tidak sesuai skenario sample');

    const testResult = await requestJson(`/test-results/${coreSubmit.data.resultId}`, { token: userToken });
    requireOk('get test result', testResult);
    requireCondition(testResult.data.coreScoring?.dominan_2_elemen === 'Api', 'Dominan II hasil test tidak sesuai');

    const generatedCertificate = await requestBuffer(`/certificates/generate-newme/${userId}`, {
      token: userToken,
    });
    requireCondition(generatedCertificate.ok, 'Generate certificate PDF gagal');
    requireCondition(generatedCertificate.buffer.subarray(0, 4).toString() === '%PDF', 'Generate certificate tidak menghasilkan PDF');

    const issuedCertificate = await requestJson('/certificates/issue', {
      method: 'POST',
      token: adminToken,
      body: {
        userId,
        certType: 'INDIVIDU',
        courseName: 'NEWME Personality Assessment',
      },
    });
    requireOk('issue certificate', issuedCertificate);
    const certificateNumber = issuedCertificate.data.certificateNumber;

    const verifyCertificate = await requestJson(`/certificates/verify/${encodeURIComponent(certificateNumber)}`);
    requireOk('verify certificate', verifyCertificate);
    requireCondition(verifyCertificate.data.valid === true, 'Certificate verify tidak valid');

    const downloadCertificate = await requestBuffer(`/certificates/download/${encodeURIComponent(certificateNumber)}`);
    requireCondition(downloadCertificate.ok, 'Download certificate gagal');
    requireCondition(downloadCertificate.buffer.subarray(0, 4).toString() === '%PDF', 'Download certificate tidak menghasilkan PDF');

    report.authAndTestFlow = {
      registeredUserEmail: userEmail,
      registeredUserId: userId,
      paymentOrderId: snapData.orderId,
      coreQuestionCount: runtimeQuestions.length,
      coreScoring: coreSubmit.data.coreScoring,
      resultId: coreSubmit.data.resultId,
      certificateNumber,
    };
  } finally {
    if (originalDomains) {
      for (const key of domainKeys) {
        try {
          await putCmsDomain(adminToken, key, originalDomains[key]);
        } catch (error) {
          report.cleanup[`restore_${key}`] = {
            ok: false,
            error: String(error?.message || error),
          };
        }
      }
    }

    for (const articleId of createdArticleIds) {
      try {
        await requestJson(`/articles/${articleId}`, {
          method: 'DELETE',
          token: adminToken,
        });
      } catch (error) {
        report.cleanup[`delete_article_${articleId}`] = {
          ok: false,
          error: String(error?.message || error),
        };
      }
    }

    for (const mediaId of createdMediaIds) {
      try {
        await requestJson(`/media/${mediaId}`, {
          method: 'DELETE',
          token: adminToken,
        });
      } catch (error) {
        report.cleanup[`delete_media_${mediaId}`] = {
          ok: false,
          error: String(error?.message || error),
        };
      }
    }
  }

  report.healthAfter = await requestJson('/health');
  requireOk('health after', report.healthAfter);

  const outputPath = saveReport(`qa-landing-cms-and-user-flow-${stamp}.json`, report);
  console.log(JSON.stringify({ outputPath, report }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
