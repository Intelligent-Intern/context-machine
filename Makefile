.PHONY: help up down reset

help: ## Show this help
	@echo "Available commands:"
	@echo "  make up     - Build & start all services"
	@echo "  make down   - Stop all services"
	@echo "  make reset   - Delete all persistent folders of the infra"
	

up: ## Build & start all services
	@./infra/scripts/make/up.sh

down: ## Stop all services
	@./infra/scripts/make/down.sh

reset: ## reset the whole infra
	@./infra/scripts/make/reset.sh

.DEFAULT_GOAL := help
