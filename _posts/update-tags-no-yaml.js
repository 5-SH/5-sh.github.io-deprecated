const fs = require('fs');
const path = require('path');

// _posts 디렉토리 내의 모든 파일을 읽어옵니다.
const postsDir = path.join(__dirname);

// _posts 디렉토리 내 모든 Markdown 파일을 찾습니다.
fs.readdir(postsDir, (err, files) => {
  if (err) {
    console.error('디렉토리를 읽는 데 실패했습니다:', err);
    return;
  }

  files.forEach(file => {
    const filePath = path.join(postsDir, file);

    // .md 확장자만 처리합니다.
    if (path.extname(file) === '.md') {
      // 파일을 읽어옵니다.
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error(`${file} 파일을 읽는 데 실패했습니다.`, err);
          return;
        }

        // Front Matter 부분과 본문 부분을 분리합니다.
        const splitData = data.split('---\n');
        if (splitData.length < 3) return; // Front Matter가 없으면 건너뜁니다.

        const frontMatter = splitData[1]; // Front Matter 부분
        const body = splitData.slice(2).join('---\n'); // 본문 부분

        // `tags` 값을 찾고, 소문자로 변환합니다.
        let updatedFrontMatter = frontMatter;
        const tagsMatch = frontMatter.match(/tags:\s*\[([^\]]+)\]/);

        if (tagsMatch) {
          // tags 부분을 찾아 소문자로 변환
          const tags = tagsMatch[1]
            .split(',')
            .map(tag => tag.trim().toLowerCase())
            .join(', ');

          // 소문자로 변환된 `tags`를 Front Matter에 적용
          updatedFrontMatter = frontMatter.replace(tagsMatch[0], `tags: [${tags}]`);
        }

        // 수정된 Front Matter와 본문을 합칩니다.
        const updatedContent = `---\n${updatedFrontMatter}---\n${body}`;

        // 파일을 덮어씁니다.
        fs.writeFile(filePath, updatedContent, 'utf8', (err) => {
          if (err) {
            console.error(`${file} 파일을 쓰는 데 실패했습니다.`, err);
            return;
          }
          console.log(`${file}의 tags를 소문자로 변환했습니다.`);
        });
      });
    }
  });
});
