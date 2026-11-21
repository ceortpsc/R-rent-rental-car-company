FROM ruby:3.3-slim
RUN apt-get update && apt-get install -y --no-install-recommends build-essential pkg-config git     && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN gem install bundler -v 2.6.7 --no-document && bundle _2.6.7_ install
COPY . .
RUN bin/check && rm -f log/* storage/*.sqlite3* tmp/local_secret.txt     && groupadd --system rrent && useradd --no-create-home --system -g rrent rrent     && chown -R rrent:rrent /app
USER rrent
ENV PORT=10000
EXPOSE 10000
CMD ["bin/start-preview"]
