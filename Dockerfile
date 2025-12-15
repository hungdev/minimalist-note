FROM php:7.4-apache

# Set PHP configuration to production
RUN cp /usr/local/etc/php/php.ini-production /usr/local/etc/php/php.ini

# Enable rewrite and headers modules
RUN a2enmod rewrite headers

# Enable .htaccess override
RUN sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

# Import App
COPY .htaccess index.php styles.css copy.js script.js markdown.js history.js favicon.ico notes.htaccess clippy.svg /var/www/html/
COPY public/js /var/www/html/js/

# Set entrypoint for permissions
COPY minimalist-web-notepad-entrypoint /usr/local/bin/
ENTRYPOINT ["minimalist-web-notepad-entrypoint"]
CMD ["apache2-foreground"]
