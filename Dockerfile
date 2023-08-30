from ubuntu 

RUN apt-get update
RUN apt-get install apache2 -y

RUN rm -rf /var/www/html/*
WORKDIR /var/www/html/
COPY . .

RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

CMD ["/usr/sbin/apache2ctl", "-DFOREGROUND"]
EXPOSE 80
