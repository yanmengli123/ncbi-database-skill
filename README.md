# NCBI Database Skill

CLI tool for querying NCBI databases via E-utilities API.

## Quick Start

```bash
# Install
npm install -g ncbi-database

# Search gene
ncbi search gene "BRCA1[gene] AND Homo sapiens[organism]"

# Get sequence
ncbi fetch nucleotide NM_001385642 -o text

# Get summary
ncbi summary gene 672

# Link to PubMed
ncbi link gene 672 pubmed
```

## Commands

- `search` - Search databases
- `fetch` - Get records
- `summary` - Get summaries
- `link` - Find linked records
- `info` - Database info
- `assembly` - Resolve assembly names
- `gene-panorama` - Gene + PubMed
- `variant` - Query variants
- `blast` - BLAST search
- `sra` - SRA info
- `espell` - Spell check
- `ecitmatch` - Citation match
- `config` - Configuration

## Supported Databases

gene, nucleotide, protein, taxonomy, pubmed, snp, clinvar, assembly, structure, geo, sra

## Documentation

See [SKILL.md](SKILL.md) for detailed usage.
