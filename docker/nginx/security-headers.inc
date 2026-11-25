# Security headers of the web app, included by default.conf (an add_header in
# a location replaces those of the server block, hence the include).
# - script-src jsQR: expo-camera scans QR codes on the web with jsQR, loaded
#   by its worker from jsDelivr (this exact, pinned file only)
# - style-src 'unsafe-inline': react-native-web injects its styles at run time
# - img-src https: profile pictures come from intra.epitech.eu
# - connect-src 'self': the Intranet is reached through /api only
# - camera=(self): QR code scanning in the browser
add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net/npm/jsqr@1.2.0/dist/jsQR.min.js; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https:; media-src 'self' blob: data:; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" always;
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options DENY always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
add_header Permissions-Policy "camera=(self), microphone=(), geolocation=()" always;
