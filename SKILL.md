# ncbi-database

通过命令行界面 (CLI) 查询和获取 NCBI 数据库数据，使用 E-utilities Entrez API。

## 何时使用

- 从 Gene 数据库查询基因信息
- 从 Nucleotide (GenBank, RefSeq) 获取 DNA/RNA 序列
- 从 Protein 数据库获取蛋白质序列
- 获取分类信息和谱系
- 搜索和获取 PubMed 文献
- 查询 dbSNP、ClinVar 的遗传变异
- 访问基因组组装和注释
- 批量下载大型数据集
- BLAST 序列搜索
- SRA 数据查询

## 安装与运行

```bash
# 直接使用 npx 运行（推荐）
npx ncbi-database search gene "BRCA1[gene]"

# 或全局安装
npm install -g ncbi-database
ncbi search gene "BRCA1[gene]"

# 本地运行
node bin/cli.js search gene "BRCA1[gene]"
```

## 命令

### search (s)

搜索 NCBI 数据库，返回 ID 列表。

```bash
ncbi search <database> <term> [options]
```

**示例：**

```bash
# 搜索人类 BRCA1 基因
ncbi search gene "BRCA1[gene] AND Homo sapiens[organism]"

# 搜索 PubMed 文献
ncbi search pubmed "CRISPR[title] AND 2023[dp]"
```

### fetch (f, efetch)

获取记录详情。

```bash
ncbi fetch <database> <id> [options]
```

**示例：**

```bash
# 获取基因记录 (JSON)
ncbi fetch gene 672

# 获取 DNA 序列 (FASTA)
ncbi fetch nucleotide NM_001385642 -o text

# 获取蛋白质序列 (FASTA)
ncbi fetch protein NP_000492 -o text

# 获取 GenBank 格式
ncbi fetch nucleotide NM_001385642 -o xml
```

### summary (sum, esummary)

获取文档摘要。

```bash
ncbi summary <database> <id> [options]
```

**示例：**

```bash
# 获取基因摘要
ncbi summary gene 672

# 获取 PubMed 文章摘要
ncbi summary pubmed 12345678
```

### link (l, elink)

查找数据库之间的链接记录。

```bash
ncbi link <source_db> <id> <target_db> [options]
```

**示例：**

```bash
# 查找基因的 PubMed 链接
ncbi link gene 672 pubmed

# 查找 PubMed 的基因链接
ncbi link pubmed 12345678 gene

# 查找基因的核酸序列
ncbi link gene 672 nucleotide
```

### info (i, einfo)

获取数据库元数据信息。

```bash
ncbi info <database>
```

**示例：**

```bash
ncbi info gene
ncbi info pubmed
ncbi info protein
```

### assembly (asm)

解析组装名称为 RefSeq accession。

```bash
ncbi assembly <assembly_name>
```

**示例：**

```bash
# 人类参考基因组
ncbi assembly GRCh38
ncbi assembly GRCh37

# 小鼠基因组
ncbi assembly mm10
ncbi assembly mm39
```

### gene-panorama (gp)

获取基因信息和关联的 PubMed 文献。

```bash
ncbi gene-panorama <gene_id_or_symbol>
```

**示例：**

```bash
# 通过基因符号查询
ncbi gene-panorama BRCA1
ncbi gene-panorama TP53

# 通过基因 ID 查询
ncbi gene-panorama 672
```

返回信息：
- 基因基本信息（ID、符号、描述、染色体位置）
- 关联 PubMed 文章数量
- 最新 PubMed 文章列表

### variant (var)

查询 ClinVar/dbsnp 变异信息。

```bash
ncbi variant <variant_id>
```

**示例：**

```bash
# 通过 rs 号查询
ncbi variant rs699
ncbi variant rs123456

# 通过 ClinVar ID 查询
ncbi variant RCV000123456
```

返回信息：
- 临床意义（Benign、Pathogenic 等）
- 审查状态
- 相关疾病
- 变异类型
- 相关基因

### blast

BLAST 序列相似性搜索。

```bash
ncbi blast <sequence> [options]
```

**示例：**

```bash
# 核酸 BLAST
ncbi blast "ATCG..." -d nucleotide

# 蛋白质 BLAST
ncbi blast "MSEQ1" -d protein

# 指定程序
ncbi blast "ATCG..." --program blastn
```

选项：
- `-d, --database <db>` - 搜索数据库（默认：nt）
- `--program <program>` - BLAST 程序（默认：megablast）

### sra

获取 SRA 运行信息。

```bash
ncbi sra <sra_id>
```

**示例：**

```bash
# 通过 SRR ID 查询
ncbi sra SRR123456

# 通过项目 ID 查询
ncbi sra PRJNA123456

# 通过实验 ID 查询
ncbi sra SRX123456
```

### espell

检查 PubMed 搜索词的拼写。

```bash
ncbi espell <term>
```

**示例：**

```bash
# 检查拼写
ncbi espell "brca1"
ncbi espell "crispr cas9"
```

### ecitmatch

将文献引用匹配到 PubMed 记录。

```bash
ncbi ecitmatch <citation>
```

**示例：**

```bash
# 作者+期刊格式
ncbi ecitmatch "Smith J, Nature 2020"

# PMID 格式
ncbi ecitmatch "PMID:12345678"
```

### config

配置管理。

```bash
ncbi config [show|set|reset]
```

**示例：**

```bash
# 查看当前配置
ncbi config

# 修改延迟
ncbi config set delay 50

# 修改 API Key
ncbi config set apikey YOUR_KEY

# 重置为默认
ncbi config reset
```

配置文件保存在：`~/.ncbi-config.json`

## 全局选项

| 选项 | 简写 | 描述 | 默认值 |
|------|------|------|--------|
| --delay | -d | 请求间隔毫秒数 | 10ms |
| --output | -o | 输出格式: json, xml, text | json |
| --outputFile | -O | 输出到文件 | - |
| --apikey | -k | NCBI API Key | 已配置 |
| --verbose | -v | 详细输出模式 | false |

## 支持的数据库

| 数据库 | 命令中写法 | 描述 |
|--------|------------|------|
| gene | gene | 基因记录及注释 |
| nucleotide | nucleotide, nuccore | DNA、RNA 序列 (GenBank, RefSeq) |
| protein | protein | 蛋白质序列 |
| taxonomy | taxonomy | 分类树 |
| pubmed | pubmed | 生物医学文献 (MEDLINE) |
| snp | snp | 单核苷酸多态性 (dbSNP) |
| clinvar | clinvar | 临床变异 |
| genome | genome | 基因组记录 |
| assembly | assembly | 基因组组装 |
| structure | structure | 大分子结构 (MMDB) |
| geo | geo, gds | 基因表达 omnibus |
| sra | sra | 序列读数档案 |

## 速率限制

- 默认: 10 请求/秒（已配置 API Key）

获取 API Key: https://www.ncbi.nlm.nih.gov/account/

## 常用示例

### 1. 搜索人类基因
```bash
ncbi search gene "BRCA1[gene] AND Homo sapiens[organism]"
```

### 2. 获取基因摘要
```bash
ncbi summary gene 672
```

### 3. 获取 DNA 序列
```bash
ncbi fetch nucleotide NM_001385642 -o text
```

### 4. 获取蛋白质序列
```bash
ncbi fetch protein NP_000492 -o text
```

### 5. 搜索 PubMed 文献
```bash
ncbi search pubmed "CRISPR[title] AND review[pt] AND 2023[dp]"
```

### 6. 查找基因的 PubMed 链接
```bash
ncbi link gene 672 pubmed
```

### 7. 获取数据库信息
```bash
ncbi info gene
```

### 8. 获取基因完整信息（含文献）
```bash
ncbi gene-panorama BRCA1
```

### 9. 查询变异信息
```bash
ncbi variant rs699
```

### 10. 保存结果到文件
```bash
ncbi search gene "BRCA1[gene]" -O result.json
ncbi fetch nucleotide NM_001385642 -O sequence.fasta -o text
```

## 错误处理

| 错误码 | 描述 | 解决方案 |
|--------|------|----------|
| 400 | 请求错误 | 检查参数语法 |
| 429 | 请求过多 | 添加 API Key，实施退避 |
| 503 | 服务不可用 | 指数退避重试 |
| 空结果 | 无匹配 | 检查搜索词拼写 |

## 更多信息

- NCBI E-utilities: https://www.ncbi.nlm.nih.gov/books/NBK25497/
- Entrez Programming Utilities: https://www.ncbi.nlm.nih.gov/books/NBK25501/
- NCBI API Keys: https://www.ncbi.nlm.nih.gov/account/
