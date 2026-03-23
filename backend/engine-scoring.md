# Engine Scoring Progress

Dokumen ini menjadi source of truth implementasi backend untuk `Core Scoring Engine` premium. Fokus dokumen ini hanya pada alur scoring baru dan guardrail yang berhubungan langsung dengan akurasi hasil.

## Ringkasan

- Scope aktif: backend premium core scoring 5 tahap.
- Scope yang sengaja tidak diubah: flow free/legacy scoring, payment, auth, CMS non-question, dan fitur lain yang tidak terkait.
- Aturan produk yang dikunci:
  - `DOB` selalu diambil dari `UserProfile.birthDate`
  - UI boleh menampilkan tes sebagai satu rangkaian soal
  - Backend tetap memproses jawaban ke `Tes A`, `Tes B`, dan `Tes C`
  - Elemen Tes C yang sama dengan `Dominan_1` selalu di-hidden dan diabaikan
  - Perhitungan desimal memakai truncation 2 digit agar sesuai expected output

## Status Implementasi

- [x] Domain constants untuk 9 kode kepribadian, elemen, hidden-group rules, dan tie-break rules.
- [x] Katalog 36 soal core premium (`Tes A`, `Tes B`, `Tes C`) dalam kode backend.
- [x] Sinkronisasi katalog ke tabel `Question` dengan metadata protected `variants.coreScoring`.
- [x] Proteksi admin update agar metadata inti scoring, option value, dan struktur jawaban core tidak berubah.
- [x] Endpoint runtime premium untuk mengambil 31 soal unified sesuai DOB user.
- [x] DTO structured submit premium dengan shape `tes_a`, `tes_b`, `tes_c`.
- [x] Service kalkulasi 5 tahap yang menghasilkan output final:
  - `dominan_1_kode`
  - `dominan_1_elemen`
  - `dominan_1_persentase`
  - `dominan_2_elemen`
  - `dominan_2_persentase`
  - `dominan_3_elemen`
  - `dominan_3_persentase`
  - `breakdown_skor_elemen_lainnya`
- [x] Persistensi hasil ke `TestSubmission` dan `TestResult`.
- [x] Adapter compat agar `TestResult` lama tetap bisa dibaca mapper existing.
- [x] Golden unit test sesuai expected output produk.
- [x] Fix Jest alias resolution untuk import `src/*`.
- [x] Seed backend sekarang ikut memastikan katalog core scoring tersedia.

## Endpoint Baru

- `GET /api/personality-tests/core-premium/questions`
  - Auth required.
  - Resolve `birthDate` user.
  - Menyembunyikan grup Tes C yang elemennya sama dengan `Dominan_1`.
  - Return flat unified question list tanpa session label.

- `POST /api/personality-tests/core-premium/submit`
  - Auth required.
  - Menerima payload:
    - `tes_a`
    - `tes_b`
    - `tes_c`
  - Menghitung hasil premium dengan engine baru.
  - Menyimpan raw structured payload dan relational `TestAnswer` untuk audit.

## File Utama yang Ditambahkan / Diubah

- `src/modules/scoring/core-scoring.types.ts`
- `src/modules/scoring/core-scoring.constants.ts`
- `src/modules/scoring/core-scoring-question-catalog.ts`
- `src/modules/scoring/core-scoring-catalog.service.ts`
- `src/modules/scoring/core-scoring.engine.service.ts`
- `src/modules/personality-tests/dto/submit-core-personality-test.dto.ts`
- `src/modules/personality-tests/personality-tests.controller.ts`
- `src/modules/personality-tests/personality-tests.service.ts`
- `src/modules/test-results/test-results.service.ts`
- `src/modules/questions/questions.service.ts`
- `src/common/mappers/test-result-client-shapes.ts`
- `prisma/seed.ts`
- `jest.config.json`

## Guardrail Akurasi

- Core question metadata disimpan di `variants.coreScoring` dan dipakai sebagai machine contract backend.
- `QuestionsService.getPublicQuestions()` mengecualikan core scoring protected questions agar flow public lama tidak tercampur.
- Update admin pada core questions hanya boleh mengubah:
  - text
  - label option
  - `isActive`
  - `order`
- Update admin tidak boleh mengubah:
  - `stage`
  - `slot`
  - `questionKey`
  - `groupKey`
  - `groupElement`
  - `option.value`
  - struktur jumlah option
  - rules weighting

## Validasi yang Sudah Dijalankan

- `npm run build`
- `npx jest --runInBand src/modules/scoring/core-scoring.engine.service.spec.ts src/modules/scoring/scoring.service.spec.ts`

## Catatan Integrasi Lanjutan

- Backend sudah siap dipakai untuk UI premium baru yang mengirim payload structured.
- Frontend premium lama belum saya ubah di pekerjaan ini, supaya tidak mengganggu fitur lain yang tidak berhubungan langsung.
- Jika nanti UI premium diintegrasikan, frontend cukup:
  - fetch `core-premium/questions`
  - render flat list sesuai `answerPath`
  - submit ke `core-premium/submit`
