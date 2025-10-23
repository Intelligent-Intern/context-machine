.PHONY: help up down reset build

help: ## Show this help
	@echo "Available commands:"
	@echo "  make up     - Start all services (build if needed)"
	@echo "  make build  - Build all service containers"
	@echo "  make down   - Stop all services"
	@echo "  make reset  - Delete all persistent folders of the infra"
	

up: ## Start all services (build if needed)
	@./infra/scripts/make/up.sh

build: ## Build all service containers
	@./infra/scripts/make/build.sh

down: ## Stop all services
	@./infra/scripts/make/down.sh

reset: ## reset the whole infra
	@./infra/scripts/make/reset.sh

.DEFAULT_GOAL := help
