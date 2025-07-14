export interface GumroadConfig {
  apiBase: string;
  products: {
    free: string;
  };
  features: {
    free: string[];
  };
}

export const GUMROAD_CONFIG: GumroadConfig = {
  apiBase: 'https://api.gumroad.com/v2',
  products: {
    free: 'free',
  },
  features: {
    free: [
      'basic_live_server',
      'https_support',
      'file_watching',
      'ai_error_analysis',
      'ai_accessibility',
      'ai_code_suggestions',
      'cloud_preview',
      'qr_code_generation',
      'visual_settings',
      'screenshot_tools',
      'dom_inspector',
      'performance_analysis',
      'seo_analysis',
      'security_scan',
      'team_collaboration',
      'offline_cloud',
      'plugin_system',
      'ci_cd_integration',
      'advanced_analytics',
      'custom_domains',
      'priority_support'
    ]
  }
};

export const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  basic_live_server: 'Basic Live Server',
  https_support: 'HTTPS Support',
  file_watching: 'File Watching',
  ai_error_analysis: 'AI Error Analysis',
  ai_accessibility: 'AI Accessibility Analysis',
  ai_code_suggestions: 'AI Code Suggestions',
  cloud_preview: 'Cloud Preview (ngrok)',
  qr_code_generation: 'QR Code Generation',
  visual_settings: 'Visual Settings Panel',
  screenshot_tools: 'Screenshot Tools',
  dom_inspector: 'DOM Inspector',
  performance_analysis: 'Performance Analysis',
  seo_analysis: 'SEO Analysis',
  security_scan: 'Security Scan',
  team_collaboration: 'Team Collaboration',
  offline_cloud: 'Offline Cloud',
  plugin_system: 'Plugin System',
  ci_cd_integration: 'CI/CD Integration',
  advanced_analytics: 'Advanced Analytics',
  custom_domains: 'Custom Domains',
  priority_support: 'Priority Support'
};

export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  basic_live_server: 'Basic live server with file watching and browser reload',
  https_support: 'HTTPS support with self-signed certificates',
  file_watching: 'Automatic file watching and browser reload',
  ai_error_analysis: 'Get intelligent explanations and solutions for console errors',
  ai_accessibility: 'Automatic WCAG compliance validation and suggestions',
  ai_code_suggestions: 'AI-powered code improvements and best practices',
  cloud_preview: 'Share your local server with anyone via public URLs',
  qr_code_generation: 'Generate QR codes for instant mobile device access',
  visual_settings: 'Beautiful GUI settings panel instead of complex JSON',
  screenshot_tools: 'Capture viewport, full page, and element screenshots',
  dom_inspector: 'Visual DOM inspector with live CSS tweaking',
  performance_analysis: 'Built-in performance auditing and optimization',
  seo_analysis: 'SEO optimization suggestions and meta tag analysis',
  security_scan: 'Security vulnerability detection and recommendations',
  team_collaboration: 'Real-time collaboration with multiple developers',
  offline_cloud: 'Local network sharing without internet dependency',
  plugin_system: 'Extensible plugin architecture for custom features',
  ci_cd_integration: 'One-click deployment to Netlify, Vercel, and more',
  advanced_analytics: 'Detailed usage analytics and performance metrics',
  custom_domains: 'Custom domain support for cloud preview',
  priority_support: 'Priority customer support and feature requests'
}; 