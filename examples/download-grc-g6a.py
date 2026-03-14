#!/usr/bin/env python3
"""
Chicken Genome (GRCg6a) Downloader

Downloads CDS, FASTA, GFF, and protein files from NCBI

Usage:
  python examples/download-grc-g6a.py [outputDir] [email] [apiKey]

Example:
  python examples/download-grc-g6a.py ./chicken-genome your@email.com YOUR_API_KEY
"""

import argparse
import os
import subprocess
import time
import urllib.parse
import urllib.request
import json
import sys

BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'


def delay(ms):
    """Simple delay function."""
    time.sleep(ms / 1000.0)


class GRCDownloader:
    def __init__(self, email='', api_key=''):
        self.email = email
        self.api_key = api_key
        # Rate limit: 3 req/s without key, 10 req/s with key
        self.rate_limit = 335 if not api_key else 100

    def _build_params(self, params):
        """Add email and API key to params if provided."""
        if self.email:
            params['email'] = self.email
        if self.api_key:
            params['api_key'] = self.api_key
        return params

    def search_assembly(self, assembly_name):
        """Search for assembly by name."""
        print(f"🔍 Searching for assembly: {assembly_name}...")
        
        params = self._build_params({
            'db': 'assembly',
            'term': f'{assembly_name}[Assembly Name]',
            'retmode': 'json',
            'retmax': 5
        })
        
        url = f"{BASE_URL}/esearch.fcgi?{urllib.parse.urlencode(params)}"
        
        delay(self.rate_limit)
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
        
        ids = data.get('esearchresult', {}).get('idlist', [])
        if not ids:
            raise ValueError(f"Assembly not found: {assembly_name}")
        
        print(f"✅ Found assembly IDs: {', '.join(ids)}")
        return ids[0]

    def get_assembly_summary(self, assembly_id):
        """Get assembly summary."""
        print(f"📋 Getting assembly summary for ID: {assembly_id}...")
        
        params = self._build_params({
            'db': 'assembly',
            'id': assembly_id,
            'retmode': 'json'
        })
        
        url = f"{BASE_URL}/esummary.fcgi?{urllib.parse.urlencode(params)}"
        
        delay(self.rate_limit)
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
        
        summary = data.get('result', {}).get(assembly_id)
        if not summary:
            raise ValueError('No summary found for assembly')
        
        ftp_path = summary.get('ftppath_genbank') or summary.get('ftppath')
        https_path = ftp_path.replace('ftp://', 'https://') if ftp_path else None
        
        print(f"📁 FTP path: {ftp_path}")
        print(f"🔗 HTTPS path: {https_path}")
        
        return summary

    def find_assembly_accession(self, assembly_name):
        """Find assembly accession and folder name."""
        # First search for the assembly
        assembly_id = self.search_assembly(assembly_name)
        
        # Get summary to find the GenBank FTP path
        summary = self.get_assembly_summary(assembly_id)
        
        # Extract FTP path
        ftp_path = summary.get('ftppath_genbank') or summary.get('ftppath')
        https_path = ftp_path.replace('ftp://', 'https://') if ftp_path else None
        
        # Extract accession (e.g., GCA_000002315.5 from /genomes/all/GCA/000/002/315/GCA_000002315.5_GRCg6a)
        accession = None
        if ftp_path:
            import re
            match = re.search(r'(GCA_\d+\.\d+)', ftp_path)
            if match:
                accession = match.group(1)
        
        print(f"🔑 GenBank Accession: {accession}")
        
        # Extract the full assembly folder name (e.g., GCA_000002315.5_GRCg6a)
        assembly_folder = ftp_path.split('/')[-1] if ftp_path else None
        print(f"📁 Assembly folder: {assembly_folder}")
        
        return {
            'assembly_id': assembly_id,
            'accession': accession,
            'assembly_folder': assembly_folder,
            'ftp_path': ftp_path,
            'https_path': https_path,
            'title': summary.get('title', '')
        }

    def download_file(self, url, output_path, max_attempts=3):
        """Download file using curl with retry logic."""
        base_delay = 5000  # 5 seconds
        
        print(f"⬇️  Downloading: {output_path}...")
        
        for attempt in range(1, max_attempts + 1):
            try:
                # Use curl for FTP downloads - more reliable than Python requests for large files
                cmd = [
                    'curl', '-#', '-L', '-o', output_path,
                    '--retry', '3',
                    '--retry-delay', '5',
                    url
                ]
                subprocess.run(cmd, check=True, capture_output=True)
                
                print(f"✅ Saved: {output_path}")
                return True
            except subprocess.CalledProcessError as error:
                is_last_attempt = attempt == max_attempts
                wait_time = base_delay * (2 ** (attempt - 1))  # Exponential backoff
                
                if is_last_attempt:
                    print(f"❌ Failed to download {output_path} after {max_attempts} attempts")
                    raise error
                
                print(f"⚠️  Attempt {attempt}/{max_attempts} failed")
                print(f"   Retrying in {wait_time/1000} seconds...")
                time.sleep(wait_time / 1000.0)

    def download_grcg6a(self, output_dir='./grc-g6a'):
        """Download GRCg6a genome files."""
        print("🧬 Starting GRCg6a Download...\n")
        
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        print(f"📂 Created directory: {output_dir}")
        
        # Find GRCg6a assembly
        assembly_info = self.find_assembly_accession('GRCg6a')
        
        print(f"\n📋 Assembly: {assembly_info['title']}")
        print(f"🔑 Accession: {assembly_info['accession']}")
        
        ftp_base = assembly_info['ftp_path']
        accession = assembly_info['accession']
        assembly_folder = assembly_info['assembly_folder']
        
        if not ftp_base or not accession or not assembly_folder:
            raise ValueError('Could not get FTP path, accession, or assembly folder from NCBI')

        # Download files
        print('\n📥 Downloading files...\n')
        
        # Build file list - use assemblyFolder (e.g., GCA_000002315.5_GRCg6a) not just accession
        files = [
            # Genomic FASTA
            {'name': 'genomic.fna.gz', 'url': f"{ftp_base}/{assembly_folder}_genomic.fna.gz"},
            # GFF3 annotations
            {'name': 'genomic.gff.gz', 'url': f"{ftp_base}/{assembly_folder}_genomic.gff.gz"},
            # CDS sequences
            {'name': 'cds_from_genomic.fna.gz', 'url': f"{ftp_base}/{assembly_folder}_cds_from_genomic.fna.gz"},
            # Protein sequences
            {'name': 'protein.faa.gz', 'url': f"{ftp_base}/{assembly_folder}_protein.faa.gz"},
            # RNA
            {'name': 'rna.fna.gz', 'url': f"{ftp_base}/{assembly_folder}_rna.fna.gz"},
            # Gene annotations
            {'name': 'gene.gff.gz', 'url': f"{ftp_base}/{assembly_folder}_gene.gff.gz"}
        ]
        
        downloaded_files = []
        
        for file in files:
            output_path = os.path.join(output_dir, file['name'])
            try:
                self.download_file(file['url'], output_path)
                downloaded_files.append(file['name'])
            except Exception as e:
                print(f"⚠️  Skipping {file['name']} due to error: {e}")
        
        print('\n✅ Downloads complete!')
        print(f"📂 Files saved to: {output_dir}/")
        
        return {
            'assembly_info': assembly_info,
            'output_dir': output_dir,
            'files': downloaded_files
        }


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description='Download Chicken Genome (GRCg6a) files from NCBI'
    )
    parser.add_argument(
        'output_dir',
        nargs='?',
        default='./grc-g6a',
        help='Output directory (default: ./grc-g6a)'
    )
    parser.add_argument(
        'email',
        nargs='?',
        default='',
        help='Email for NCBI (optional, but recommended)'
    )
    parser.add_argument(
        'api_key',
        nargs='?',
        default='',
        help='NCBI API key (optional, for faster downloads)'
    )
    
    args = parser.parse_args()
    
    print('========================================')
    print('   Chicken Genome (GRCg6a) Downloader')
    print('========================================\n')
    
    if not args.email:
        print('💡 Tip: Add email and API key for faster downloads:')
        print('   python examples/download-grc-g6a.py ./chicken your@email.com YOUR_API_KEY\n')
    
    downloader = GRCDownloader(email=args.email, api_key=args.api_key)
    
    try:
        downloader.download_grcg6a(args.output_dir)
    except Exception as e:
        print(f'❌ Error: {e}')
        sys.exit(1)


if __name__ == '__main__':
    main()
