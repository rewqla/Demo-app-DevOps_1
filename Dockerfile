from ubuntu 
RUN apt-get update
RUN apt-get install apache2 -y
RUN rm -rf /var/www/html/*
WORKDIR /var/www/html/
COPY . .
CMD ["/usr/sbin/apache2ctl", "-DFOREGROUND"]
EXPOSE 80
