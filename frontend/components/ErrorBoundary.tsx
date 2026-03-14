// @ts-nocheck
import React from 'react';

// No lucide-react or Button imports here — ErrorBoundary is in the critical
// loading path (eagerly imported in App.js shell) so it must stay dependency-free.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(248,113,113,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <span style={{ fontSize: 36 }}>⚠️</span>
            </div>
            <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Terjadi Kesalahan</h1>
            <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
              Maaf, terjadi kesalahan yang tidak terduga. Silakan coba muat ulang halaman.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={this.handleReset} style={{ background: '#facc15', color: '#1a1a1a', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1.25rem', fontWeight: 600, cursor: 'pointer' }}>
                Coba Lagi
              </button>
              <button onClick={() => window.location.href = '/'} style={{ background: 'transparent', color: '#facc15', border: '1px solid rgba(250,204,21,0.5)', borderRadius: '0.5rem', padding: '0.5rem 1.25rem', cursor: 'pointer' }}>
                Beranda
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

