/**
 * Chicken Genome (GRCg6a) Downloader
 * 
 * Downloads CDS, FASTA, GFF, and protein files from NCBI
 * 
 * Usage:
 *   node examples/download-grc-g6a.js [outputDir] [email] [apiKey]
 * 
 * Example:
 *   node examples/download-grc-g6a.js ./chicken-genome your@email.com YOUR_API_KEY
 */

import axios from 'axios';
import { createWriteStream, mkdirSync, existsSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

// Rate limiter
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class GRCDownloader {
  constructor(options = {}) {
    this.email = options.email || '';
    this.apiKey = options.apiKey || '';
    this.rateLimit = this.apiKey ? 100 : 335; // ms between requests (3 req/s without key)
  }

  async searchAssembly(assemblyName) {
    console.log(`🔍 Searching for assembly: ${assemblyName}...`);
    
    const url = `${BASE_URL}/esearch.fcgi`;
    const params = {
      db: 'assembly',
      term: `${assemblyName}[Assembly Name]`,
      retmode: 'json',
      retmax: 5
    };
    
    if (this.email) params.email = this.email;
    if (this.apiKey) params.api_key = this.apiKey;

    await delay(this.rateLimit);
    const response = await axios.get(url, { params });
    
    const ids = response.data.esearchresult?.idlist || [];
    if (ids.length === 0) {
      throw new Error(`Assembly not found: ${assemblyName}`);
    }
    
    console.log(`✅ Found assembly IDs: ${ids.join(', ')}`);
    return ids[0];
  }

  async getAssemblySummary(assemblyId) {
    console.log(`📋 Getting assembly summary for ID: ${assemblyId}...`);
    
    const url = `${BASE_URL}/esummary.fcgi`;
    const params = {
      db: 'assembly',
      id: assemblyId,
      retmode: 'json'
    };
    
    if (this.email) params.email = this.email;
    if (this.apiKey) params.api_key = this.apiKey;

    await delay(this.rateLimit);
    const response = await axios.get(url, { params });
    
    const summary = response.data.result?.[assemblyId];
    if (!summary) {
      throw new Error('No summary found for assembly');
    }
    
    // Extract FTP path and convert to HTTPS
    const ftpPath = summary.ftppath_genbank || summary.ftppath;
    console.log(`📁 FTP path: ${ftpPath}`);
    
    // Convert FTP to HTTPS URL (NCBI supports both)
    const httpsPath = ftpPath ? ftpPath.replace('ftp://', 'https://') : null;
    console.log(`🔗 HTTPS path: ${httpsPath}`);
    
    return summary;
  }

  async findAssemblyAccession(assemblyName) {
    // First search for the assembly
    const assemblyId = await this.searchAssembly(assemblyName);
    
    // Get summary to find the GenBank FTP path
    const summary = await this.getAssemblySummary(assemblyId);
    
    // Extract FTP path and convert to HTTPS
    const ftpPath = summary.ftppath_genbank || summary.ftppath;
    const httpsPath = ftpPath ? ftpPath.replace('ftp://', 'https://') : null;
    
    // Extract accession from FTP path (e.g., GCA_000002315.5 from /genomes/all/GCA/000/002/315/GCA_000002315.5_GRCg6a)
    let accession = null;
    if (ftpPath) {
      const match = ftpPath.match(/GCA_\d+\.\d+/);
      if (match) {
        accession = match[0];
      }
    }
    
    console.log(`🔑 GenBank Accession: ${accession}`);
    
    // Extract the full assembly folder name from FTP path (e.g., GCA_000002315.5_GRCg6a)
    const assemblyFolder = ftpPath ? ftpPath.split('/').pop() : null;
    console.log(`📁 Assembly folder: ${assemblyFolder}`);
    
    return {
      assemblyId,
      accession,
      assemblyFolder,
      ftpPath,
      httpsPath,
      title: summary.title
    };
  }

  async downloadFile(url, outputPath, attempt = 1, maxAttempts = 3) {
    const maxRetries = 3;
    const baseDelay = 5000; // 5 seconds
    
    console.log(`⬇️  Downloading: ${outputPath}...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Use curl for FTP downloads - more reliable than axios for large files
        const curlCmd = `curl -# -L -o "${outputPath}" --retry 3 --retry-delay 5 "${url}"`;
        await execAsync(curlCmd);
        
        console.log(`✅ Saved: ${outputPath}`);
        return true;
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts;
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        
        if (isLastAttempt) {
          console.error(`❌ Failed to download ${outputPath} after ${maxAttempts} attempts: ${error.message}`);
          throw error;
        }
        
        console.warn(`⚠️  Attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
        console.warn(`   Retrying in ${delay/1000} seconds...`);
        await delay(delay);
      }
    }
  }

  async downloadGRCg6a(outputDir = './grc-g6a') {
    console.log('🧬 Starting GRCg6a Download...\n');
    
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
      console.log(`📂 Created directory: ${outputDir}`);
    }
    
    // Find GRCg6a assembly
    const assemblyInfo = await this.findAssemblyAccession('GRCg6a');
    
    console.log(`\n📋 Assembly: ${assemblyInfo.title}`);
    console.log(`🔑 Accession: ${assemblyInfo.accession}`);
    
    const ftpBase = assemblyInfo.ftpPath;
    const accession = assemblyInfo.accession;
    const assemblyFolder = assemblyInfo.assemblyFolder;
    
    if (!ftpBase || !accession || !assemblyFolder) {
      throw new Error('Could not get FTP path, accession, or assembly folder from NCBI');
    }

    // Download files
    console.log('\n📥 Downloading files...\n');
    
    // Build file list - use assemblyFolder (e.g., GCA_000002315.5_GRCg6a) not just accession (GCA_000002315.5)
    const files = [
      // Genomic FASTA
      { name: 'genomic.fna.gz', url: `${ftpBase}/${assemblyFolder}_genomic.fna.gz` },
      // GFF3 annotations
      { name: 'genomic.gff.gz', url: `${ftpBase}/${assemblyFolder}_genomic.gff.gz` },
      // CDS sequences
      { name: 'cds_from_genomic.fna.gz', url: `${ftpBase}/${assemblyFolder}_cds_from_genomic.fna.gz` },
      // Protein sequences  
      { name: 'protein.faa.gz', url: `${ftpBase}/${assemblyFolder}_protein.faa.gz` },
      // RNA
      { name: 'rna.fna.gz', url: `${ftpBase}/${assemblyFolder}_rna.fna.gz` },
      // Gene annotations
      { name: 'gene.gff.gz', url: `${ftpBase}/${assemblyFolder}_gene.gff.gz` }
    ];

    const downloadedFiles = [];
    
    for (const file of files) {
      const outputPath = `${outputDir}/${file.name}`;
      try {
        await this.downloadFile(file.url, outputPath);
        downloadedFiles.push(file.name);
      } catch (error) {
        console.error(`⚠️  Skipping ${file.name} due to error`);
      }
    }
    
    console.log('\n✅ Downloads complete!');
    console.log(`📂 Files saved to: ${outputDir}/`);
    
    return {
      assemblyInfo,
      outputDir,
      files: downloadedFiles
    };
  }
}

// Export for use as module
export { GRCDownloader };

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  const outputDir = args[0] || './grc-g6a';
  const email = args[1] || '';
  const apiKey = args[2] || '';

  console.log('========================================');
  console.log('   Chicken Genome (GRCg6a) Downloader');
  console.log('========================================\n');

  if (!email) {
    console.log('💡 Tip: Add email and API key for faster downloads:');
    console.log('   node examples/download-grc-g6a.js ./chicken your@email.com YOUR_API_KEY\n');
  }

  const downloader = new GRCDownloader({ email, apiKey });

  try {
    await downloader.downloadGRCg6a(outputDir);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('📄 NCBI Response:', error.response.status, error.response.statusText);
    }
    process.exit(1);
  }
}

// Always run main when executed directly
main();
