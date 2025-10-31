#!/bin/sh
# Generate self-signed SSL certificate for development
# For production, use Let's Encrypt certificates

mkdir -p ssl

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/key.pem \
    -out ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

echo "✅ Self-signed SSL certificate generated in ssl/ directory"
echo "📝 For production, replace these with Let's Encrypt certificates"

