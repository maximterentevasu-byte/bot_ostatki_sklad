const axios = require('axios');

class GitHubService {
  constructor(config) {
    this.owner = config.githubOwner;
    this.repo = config.githubRepo;
    this.branch = config.githubBranch;
    this.uploadDir = config.githubUploadDir;

    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${config.githubToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      timeout: 30000
    });
  }

  buildPath(fileName = '') {
    const cleanName = String(fileName).replace(/^\/+/, '');
    return cleanName ? `${this.uploadDir}/${cleanName}` : this.uploadDir;
  }

  async listUploadDir() {
    const path = this.buildPath();

    try {
      const response = await this.client.get(`/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`, {
        params: { ref: this.branch }
      });

      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      if (error.response?.status === 404) {
        return [];
      }
      throw this.wrapError(error, 'Не удалось получить список файлов из GitHub.');
    }
  }

  async deleteAllFilesInUploadDir() {
    const items = await this.listUploadDir();
    const files = items.filter((item) => item.type === 'file');

    for (const file of files) {
      await this.client.delete(`/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(file.path).replace(/%2F/g, '/')}`, {
        data: {
          message: `Delete old file ${file.name}`,
          sha: file.sha,
          branch: this.branch
        }
      });
    }
  }

  async uploadSingleFile(fileName, buffer) {
    await this.deleteAllFilesInUploadDir();

    const path = this.buildPath(fileName);
    const response = await this.client.put(`/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`, {
      message: `Upload ${fileName}`,
      content: buffer.toString('base64'),
      branch: this.branch
    });

    return response.data;
  }

  async getCurrentExcelFile() {
    const items = await this.listUploadDir();
    const excelFile = items.find((item) => item.type === 'file' && /\.(xlsx|xls|xlsm|xlsb)$/i.test(item.name));

    if (!excelFile) {
      throw new Error('В папке GitHub не найден Excel-файл. Сначала загрузите базу через кнопку «Загрузить файл».');
    }

    const response = await this.client.get(`/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(excelFile.path).replace(/%2F/g, '/')}`, {
      params: { ref: this.branch }
    });

    const content = response.data?.content;
    if (!content) {
      throw new Error('Не удалось скачать Excel-файл из GitHub.');
    }

    return {
      name: excelFile.name,
      path: excelFile.path,
      buffer: Buffer.from(content.replace(/\n/g, ''), 'base64')
    };
  }

  wrapError(error, fallbackMessage) {
    const githubMessage = error.response?.data?.message;
    return new Error(githubMessage ? `${fallbackMessage} GitHub: ${githubMessage}` : fallbackMessage);
  }
}

module.exports = { GitHubService };
