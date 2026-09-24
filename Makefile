# Cross-Platform Makefile for gsolut-trading-multitool
# Works seamlessly on Windows (pwsh/make), Linux, and macOS

PNPM = pnpm

.PHONY: all help install check check-ci lint format typecheck test build clean dev-radar dev-web

all: install check build

help:
	@echo ================================================================
	@echo  Trading Multitool 02 - Developer Commands
	@echo ================================================================
	@echo   make install     - Install all workspace dependencies
	@echo   make check       - Run Biome linter, formatter and imports check
	@echo   make check-ci    - Run Biome check in CI mode (no writes)
	@echo   make lint        - Run Biome lint
	@echo   make format      - Format all files with Biome
	@echo   make typecheck   - Run TypeScript typecheck across all packages
	@echo   make test        - Run test suites across all packages
	@echo   make build       - Build all packages and applications
	@echo   make clean       - Remove all build and temporary artifacts
	@echo   make dev-radar   - Start Spot Radar scanner daemon in dev mode
	@echo   make dev-web     - Start Web dashboard in dev mode
	@echo ================================================================

install:
	$(PNPM) install

check:
	$(PNPM) run check

check-ci:
	$(PNPM) run check:ci

lint:
	$(PNPM) run lint

format:
	$(PNPM) run format

typecheck:
	$(PNPM) run typecheck

test:
	$(PNPM) run test

build:
	$(PNPM) run build

clean:
	$(PNPM) run clean

dev-radar:
	$(PNPM) --filter @gsolut/spot-radar dev

dev-web:
	$(PNPM) --filter @gsolut/web dev
