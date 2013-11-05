test:
	@NODE_ENV=test ./node_modules/.bin/mocha  --timeout 8000

.PHONY: test
