test:
	@NODE_ENV=test ./node_modules/.bin/mocha  --timeout 30000


lint:
	./node_modules/.bin/jshint ./test ./index.js

test-cov:
	$(MAKE) lint
	@NODE_ENV=test ./node_modules/.bin/istanbul cover \
	./node_modules/mocha/bin/_mocha -- -R spec




.PHONY: test
