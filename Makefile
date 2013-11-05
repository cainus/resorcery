test:
	@NODE_ENV=test ./node_modules/.bin/mocha  --timeout 30000

.PHONY: test
