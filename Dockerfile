FROM ruby:3.0 AS builder
RUN bundle config --global frozen 1

WORKDIR /app

COPY Gemfile Gemfile.lock ./
RUN bundle install
COPY . .
RUN bundle exec nanoc

FROM nginx:stable-alpine
COPY --from=builder /app/public /usr/share/nginx/html
