openssl x509 -req -in server.csr.pem -CA my-root-ca.cert.pem -CAkey my-root-ca.key.pem \
  -CAcreateserial -out cert.pem -days 3650 -sha256 -extfile ./san.cnf -extensions san