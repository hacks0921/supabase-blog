module.exports = (req, res) => {
  // 브라우저에서 스크립트 리소스로 실행되도록 MIME타입 헤더 추가
  res.setHeader('Content-Type', 'application/javascript');
  
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || '';
  
  res.status(200).send(`
    window.CONFIG = {
      SUPABASE_URL: "${url}",
      SUPABASE_ANON_KEY: "${key}"
    };
  `);
};
