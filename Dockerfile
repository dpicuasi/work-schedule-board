# Usa una imagen de NGINX para servir archivos estáticos
FROM nginx:alpine

# Copia la app Angular al directorio por defecto de NGINX
COPY ./docs/browser /usr/share/nginx/html

# Copia una configuración personalizada de NGINX si necesitas (opcional)
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
