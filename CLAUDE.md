# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `ncbi-database-skill` - a Node.js CLI tool for querying NCBI (National Center for Biotechnology Information) databases via the E-utilities Entrez API. It supports querying Gene, PubMed, ClinVar, Nucleotide, Protein, Taxonomy, SRA, BLAST, and more.

## Common Commands

```bash
# Install dependencies
npm install

# Run CLI
node bin/cli.js --help

# Run tests
npm test

# Search NCBI databases
node bin/cli.js search gene "BRCA1[gene] AND Homo sapiens[organism]"

# Fetch records
node bin/cli.js fetch gene 672 -o json
node bin/cli.js fetch nucleotide NM_001385642 -o text

# Get summaries
node bin/cli.js summary gene 672 -o json

# Link queries (find related records)
node bin/cli.js link gene 672 pubmed
```

## Architecture

```
bin/cli.js          # CLI entry point (command parsing)
└── src/ncbi-client.js    # Core API client with E-utilities methods
        ├── src/errors.js         # Custom error hierarchy
        ├── src/validators.js    # Input validators
        └── src/rate-limiter.js  # Rate limiting (10 req/s with API key)
```

## Code Style (from AGENTS.md)

- **Import order**: External libs → Node built-ins → Local modules
- **Indentation**: 2 spaces
- **No semicolons** (use ASI)
- **Single quotes** for strings
- **async/await** required (never .then() chains)
- Use custom error classes: `ValidationError`, `APIError`, `NetworkError`, `TimeoutError`

## Supported Databases

gene, nucleotide, protein, taxonomy, pubmed, snp, clinvar, assembly, structure, geo, sra

## Rate Limits

- Default: 10 requests/second (with API key)
- Get API key: https://www.ncbi.nlm.nih.gov/account/

## Default Configuration (in bin/cli.js)

- API Key: configured by default (use environment variables for production)
- Email: configured by default
- Delay: 10ms (enables faster requests)

> **Note**: For production use, remove hardcoded credentials and use environment variables instead.
