/**
 * DevLog - SPA 블로그 및 게시판 핵심 스크립트 (댓글 기능 지원)
 * 
 * 작성일: 2026-07-28
 * 작성자: Antigravity AI Coding Assistant
 */

// 1. 전역 상태 및 상수 선언
const STATE = {
  session: null,
  currentView: 'list',
  currentPostId: null,
  authMode: 'login' // 'login' 또는 'register'
};

// 매직 넘버 방지를 위한 상수 정의
const ROUTE_HASH = {
  LIST: '#list',
  WRITE: '#write',
  DETAIL: '#post/',
  EDIT: '#edit/',
  ABOUT: '#about',
  MONEY: '#money-note',
  AI: '#ai-note'
};

// 2. Supabase 클라이언트 초기화
let supabaseClient = null;

function initSupabase() {
  try {
    if (typeof CONFIG === 'undefined' || !CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL.includes('your-project-id')) {
      showToast('Supabase 설정이 필요합니다. config.js를 확인해주세요.', 'error');
      console.warn('[Supabase Config Warning] CONFIG 객체가 없거나 기본값 상태입니다. config.js에 실제 Supabase URL과 Anon Key를 입력해주세요.');
      return false;
    }
    
    // UMD 패키지로 로드된 supabase.createClient 사용
    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    return true;
  } catch (error) {
    logError('Supabase Initialization', error);
    showToast('Supabase 클라이언트 초기화 중 오류가 발생했습니다.', 'error');
    return false;
  }
}

// 3. 에러 로깅 유틸리티 함수
function logError(type, error) {
  const timestamp = new Date().toISOString();
  const errorMessage = error.message || error;
  console.error(`[${timestamp}] ERROR TYPE: ${type} | MESSAGE: ${errorMessage}`, error);
}

// 4. 토스트 알림창 출력 함수
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  
  const textNode = document.createElement('span');
  textNode.innerText = message;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => toast.remove();
  
  toast.appendChild(textNode);
  toast.appendChild(closeBtn);
  container.appendChild(toast);
  
  // 3초 후 자동 제거
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'fadeOut 0.3s forwards';
      // 애니메이션 미동작을 대비한 백업 타이머 설정 (350ms 후 강제 삭제)
      const forceRemove = setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 350);
      
      toast.addEventListener('animationend', () => {
        clearTimeout(forceRemove);
        toast.remove();
      });
    }
  }, 3000);
}

// 5. 날짜 포맷 함수 (YYYY.MM.DD HH:mm)
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}.${month}.${day} ${hours}:${minutes}`;
}

// 6. SPA 라우팅 및 뷰 전환 기능
function switchView(viewName, params = {}) {
  STATE.currentView = viewName;
  
  // 모든 섹션 비활성화
  document.querySelectorAll('.app-section').forEach(sec => sec.classList.remove('active'));
  
  // 네비게이션 액티브 클래스 초기화
  document.querySelectorAll('.main-nav .nav-link').forEach(link => link.classList.remove('active'));
  
  // 타겟 섹션 활성화 및 데이터 로딩
  if (viewName === 'list') {
    const listSec = document.getElementById('section-posts-list');
    listSec.classList.add('active');
    document.getElementById('nav-link-blog').classList.add('active');
    document.querySelector('#section-posts-list .list-header h2').innerText = '최신 트렌딩 포스트';
    loadPosts();
  } else if (viewName === 'money-note') {
    const listSec = document.getElementById('section-posts-list');
    listSec.classList.add('active');
    document.getElementById('nav-link-money').classList.add('active');
    document.querySelector('#section-posts-list .list-header h2').innerText = 'Money-note 💰';
    loadPosts('money-note');
  } else if (viewName === 'ai-note') {
    const listSec = document.getElementById('section-posts-list');
    listSec.classList.add('active');
    document.getElementById('nav-link-ai').classList.add('active');
    document.querySelector('#section-posts-list .list-header h2').innerText = 'AI-note 🤖';
    loadPosts('ai-note');
  } else if (viewName === 'about') {
    const aboutSec = document.getElementById('section-about');
    aboutSec.classList.add('active');
    document.getElementById('nav-link-about').classList.add('active');
  } else if (viewName === 'detail') {
    const detailSec = document.getElementById('section-post-detail');
    detailSec.classList.add('active');
    if (params.id) {
      STATE.currentPostId = params.id;
      loadPostDetail(params.id);
    }
  } else if (viewName === 'form') {
    const formSec = document.getElementById('section-post-form');
    formSec.classList.add('active');
    setupPostForm(params.id); // params.id가 있으면 수정 모드, 없으면 작성 모드
  }
}

// 브라우저 해시 변경 감지 라우터
function handleRouting() {
  const hash = window.location.hash;
  
  if (!hash || hash === ROUTE_HASH.LIST) {
    switchView('list');
  } else if (hash === ROUTE_HASH.ABOUT) {
    switchView('about');
  } else if (hash === ROUTE_HASH.MONEY) {
    switchView('money-note');
  } else if (hash === ROUTE_HASH.AI) {
    switchView('ai-note');
  } else if (hash.startsWith(ROUTE_HASH.DETAIL)) {
    const id = hash.replace(ROUTE_HASH.DETAIL, '');
    switchView('detail', { id: parseInt(id) });
  } else if (hash === ROUTE_HASH.WRITE) {
    if (!STATE.session) {
      showToast('로그인이 필요한 기능입니다.', 'error');
      window.location.hash = ROUTE_HASH.LIST;
      showAuthModal('login');
      return;
    }
    switchView('form');
  } else if (hash.startsWith(ROUTE_HASH.EDIT)) {
    if (!STATE.session) {
      showToast('로그인이 필요한 기능입니다.', 'error');
      window.location.hash = ROUTE_HASH.LIST;
      return;
    }
    const id = hash.replace(ROUTE_HASH.EDIT, '');
    switchView('form', { id: parseInt(id) });
  }
}

// 7. 인증(Auth) 관련 로직
function showAuthModal(mode = 'login') {
  const modal = document.getElementById('auth-modal');
  const modalTitle = document.getElementById('modal-title');
  const authForm = document.getElementById('auth-form');
  const submitBtn = document.getElementById('btn-auth-submit');
  const toggleText = document.getElementById('modal-toggle-text');
  const toggleLink = document.getElementById('btn-toggle-auth-mode');
  
  STATE.authMode = mode;
  modal.classList.add('active');
  authForm.reset();
  
  if (mode === 'login') {
    modalTitle.innerText = '로그인';
    submitBtn.innerText = '로그인';
    toggleText.innerText = '계정이 없으신가요?';
    toggleLink.innerText = '회원가입하기';
  } else {
    modalTitle.innerText = '회원가입';
    submitBtn.innerText = '회원가입';
    toggleText.innerText = '이미 계정이 있으신가요?';
    toggleLink.innerText = '로그인하기';
  }
}

// 모달 닫기
function hideAuthModal() {
  const modal = document.getElementById('auth-modal');
  modal.classList.remove('active');
}

// 회원가입 및 로그인 통합 서브밋 처리
async function handleAuthSubmit(e) {
  e.preventDefault();
  if (!supabaseClient) return;
  
  const email = document.getElementById('input-auth-email').value.trim();
  const password = document.getElementById('input-auth-password').value;
  
  if (!email || !password) {
    showToast('이메일과 비밀번호를 모두 입력해 주세요.', 'error');
    return;
  }
  
  if (password.length < 6) {
    showToast('비밀번호는 최소 6자리 이상이어야 합니다.', 'error');
    return;
  }
  
  const submitBtn = document.getElementById('btn-auth-submit');
  submitBtn.disabled = true;
  submitBtn.innerText = STATE.authMode === 'login' ? '로그인 중...' : '회원가입 중...';
  
  try {
    if (STATE.authMode === 'login') {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showToast('성공적으로 로그인되었습니다!', 'success');
      hideAuthModal();
    } else {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      
      // Supabase 가입 정책에 따라 이메일 인증이 활성화되어 있을 수 있음
      if (data.user && data.session === null) {
        showToast('회원가입 성공! 이메일 인증 링크를 확인해 주세요.', 'info');
      } else {
        showToast('회원가입 및 로그인이 완료되었습니다!', 'success');
      }
      hideAuthModal();
    }
  } catch (error) {
    logError('Authentication', error);
    showToast(error.message || '인증 처리에 실패했습니다.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = STATE.authMode === 'login' ? '로그인' : '회원가입';
  }
}

// 로그아웃
async function handleLogout() {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    showToast('로그아웃 되었습니다.', 'success');
    window.location.hash = ROUTE_HASH.LIST;
  } catch (error) {
    logError('Logout', error);
    showToast('로그아웃 중 오류가 발생했습니다.', 'error');
  }
}

// 인증 세션 상태에 따라 UI 업데이트
function updateAuthUI(session) {
  STATE.session = session;
  
  const userInfoArea = document.getElementById('user-info-area');
  const displayEmail = document.getElementById('display-user-email');
  const showLoginBtn = document.getElementById('btn-show-login');
  const navWriteBtn = document.getElementById('btn-nav-write');
  const logoutBtn = document.getElementById('btn-auth-logout');
  
  // 댓글 입력 창 로그인 상태 제어
  const commentAuthFallback = document.getElementById('comment-auth-fallback-msg');
  const commentWriteForm = document.getElementById('comment-write-form');
  
  if (session && session.user) {
    // 로그인 상태
    displayEmail.innerText = session.user.email;
    userInfoArea.style.display = 'flex';
    showLoginBtn.style.display = 'none';
    navWriteBtn.style.display = 'inline-flex';
    logoutBtn.style.display = 'inline-flex';
    
    // 댓글 창 노출 분기
    if (commentAuthFallback && commentWriteForm) {
      commentAuthFallback.style.display = 'none';
      commentWriteForm.style.display = 'flex';
    }
  } else {
    // 로그아웃 상태
    userInfoArea.style.display = 'none';
    showLoginBtn.style.display = 'inline-flex';
    navWriteBtn.style.display = 'none';
    logoutBtn.style.display = 'none';
    
    // 댓글 창 노출 분기
    if (commentAuthFallback && commentWriteForm) {
      commentAuthFallback.style.display = 'block';
      commentWriteForm.style.display = 'none';
    }
  }
  
  // 현재 상세 보기 페이지라면 본인 글일 시의 수정/삭제 버튼 노출 여부 다시 갱신
  if (STATE.currentView === 'detail') {
    updateDetailActionsVisibility();
    // 댓글 목록도 작성 상태에 따라 삭제 버튼 노출을 위해 갱신 리로드 유도
    if (loadedPostData) {
      loadPostDetail(loadedPostData.id);
    }
  }
}

// 8. 게시글 데이터 연동 로직
// 8-1. 목록 조회
async function loadPosts(category = null) {
  if (!supabaseClient) return;
  
  const spinner = document.getElementById('posts-list-spinner');
  const gridContainer = document.getElementById('posts-grid-container');
  const emptyState = document.getElementById('posts-empty-state');
  
  spinner.style.display = 'flex';
  gridContainer.style.display = 'none';
  emptyState.style.display = 'none';
  
  try {
    // posts와 post_likes 관계를 조인하여 좋아요 레코드를 함께 가져옴
    let query = supabaseClient
      .from('posts')
      .select('*, post_likes(id, user_id)')
      .order('created_at', { ascending: false });
      
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data: posts, error } = await query;
      
    if (error) throw error;
    
    gridContainer.innerHTML = '';
    
    if (!posts || posts.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    
    posts.forEach(post => {
      const likesCount = post.post_likes ? post.post_likes.length : 0;
      
      // 현재 로그인 유저가 이 글에 좋아요를 눌렀는지 여부 판단
      const isLikedByMe = STATE.session && STATE.session.user && post.post_likes 
        ? post.post_likes.some(like => like.user_id === STATE.session.user.id) 
        : false;
        
      // 마크다운 텍스트에서 프리뷰용 일반 텍스트 추출 (HTML 태그 및 특수문자 일부 제외)
      const plainTextPreview = post.content
        .replace(/[#*`_~\[\]()]/g, '') // 마크다운 마크업 단순 제거
        .substring(0, 150) + (post.content.length > 150 ? '...' : '');

      // 본문에서 첫 번째 이미지 URL 추출
      const firstImageUrl = extractFirstImageUrl(post.content);
      let thumbnailHTML = '';
      
      if (firstImageUrl) {
        thumbnailHTML = `<div class="post-card-thumbnail"><img src="${escapeHTML(firstImageUrl)}" alt="${escapeHTML(post.title)} 썸네일"></div>`;
      } else {
        thumbnailHTML = `<div class="post-card-thumbnail default-thumb"></div>`;
      }

      const card = document.createElement('div');
      card.className = 'post-card';
      card.setAttribute('role', 'link');
      card.setAttribute('tabindex', '0');
      card.onclick = () => {
        window.location.hash = `${ROUTE_HASH.DETAIL}${post.id}`;
      };
      
      // 키보드 접근성 대응 (Enter 키 입력 시 이동)
      card.onkeydown = (e) => {
        if (e.key === 'Enter') {
          window.location.hash = `${ROUTE_HASH.DETAIL}${post.id}`;
        }
      };
      
      card.innerHTML = `
        ${thumbnailHTML}
        <div class="post-card-content">
          <div class="post-card-body">
            <h3 class="post-card-title">${escapeHTML(post.title)}</h3>
            <p class="post-card-preview">${escapeHTML(plainTextPreview)}</p>
          </div>
          <div class="post-card-footer">
            <div class="post-card-meta">
              <span>${escapeHTML(post.author_email ? post.author_email.split('@')[0] : '알 수 없음')}</span>
              <span>•</span>
              <span>${formatDate(post.created_at)}</span>
            </div>
            <div class="post-card-stats">
              <div class="stat-item">
                <span>👁️</span> ${post.views}
              </div>
              <div class="stat-item ${isLikedByMe ? 'active-heart' : ''}">
                <span>❤️</span> ${likesCount}
              </div>
            </div>
          </div>
        </div>
      `;
      gridContainer.appendChild(card);
    });
    
    gridContainer.style.display = 'grid';
  } catch (error) {
    logError('Load Posts', error);
    showToast('게시글 목록을 불러오지 못했습니다.', 'error');
  } finally {
    spinner.style.display = 'none';
  }
}

// 8-2. 상세 보기
let loadedPostData = null; // 현재 상세보기로 불러온 포스트 원본 데이터 저장

async function loadPostDetail(id) {
  if (!supabaseClient) return;
  
  try {
    // 1. 조회수 증가 비동기 호출 (실패하더라도 본문 열람에 영향 주지 않도록 독립된 try-catch로 예외 차단)
    (async () => {
      try {
        const { error } = await supabaseClient.rpc('increment_views', { post_id: id });
        if (error) throw error;
      } catch (rpcError) {
        logError('Increment Views (RPC)', rpcError);
      }
    })();
    
    // 2. 게시글 상세정보 조회 (좋아요 조인 포함)
    const { data: post, error } = await supabaseClient
      .from('posts')
      .select('*, post_likes(id, user_id)')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    if (!post) {
      showToast('존재하지 않는 게시글입니다.', 'error');
      window.location.hash = ROUTE_HASH.LIST;
      return;
    }
    
    loadedPostData = post;
    
    // UI 반영
    document.getElementById('detail-title').innerText = post.title;
    document.getElementById('detail-author').innerText = post.author_email || '알 수 없음';
    document.getElementById('detail-date').innerText = formatDate(post.created_at);
    // 조회수는 갱신 전 값일 수 있으므로 화면에는 +1 한 값으로 표기(자연스러운 연출)
    document.getElementById('detail-views-count').innerText = `조회수 ${post.views + 1}`;
    
    // 마크다운 파싱 렌더링 (marked 사용)
    const rawMarkdown = post.content;
    const contentArea = document.getElementById('detail-markdown-content');
    if (window.marked && typeof window.marked.parse === 'function') {
      contentArea.innerHTML = window.marked.parse(rawMarkdown);
    } else {
      contentArea.innerText = rawMarkdown;
    }
    
    // 수정 / 삭제 버튼 노출 제어
    updateDetailActionsVisibility();
    
    // 좋아요 상태 갱신
    updateLikeUI(post.post_likes);
    
    // 3. 댓글 데이터 로드 연동 (실패하더라도 본문 열람에 영향 주지 않도록 독립된 try-catch로 예외 격리)
    let comments = [];
    try {
      const { data, error: commentsError } = await supabaseClient
        .from('post_comments')
        .select('*')
        .eq('post_id', id)
        .order('created_at', { ascending: true });
        
      if (commentsError) throw commentsError;
      comments = data || [];
    } catch (commentsError) {
      logError('Load Comments List (post_comments table may not exist yet)', commentsError);
    }
    
    // 댓글 렌더링 실행
    renderComments(comments);
    
  } catch (error) {
    logError('Load Post Detail', error);
    showToast('게시글 상세 내용을 불러오지 못했습니다.', 'error');
    window.location.hash = ROUTE_HASH.LIST;
  }
}

function updateDetailActionsVisibility() {
  const actionsDiv = document.getElementById('detail-owner-actions');
  if (loadedPostData && STATE.session && STATE.session.user && loadedPostData.author_id === STATE.session.user.id) {
    actionsDiv.style.display = 'flex';
  } else {
    actionsDiv.style.display = 'none';
  }
}

// 8-3. 좋아요 상태 렌더링
function updateLikeUI(postLikes) {
  const likeBtn = document.getElementById('btn-like-toggle');
  const likeCountSpan = document.getElementById('detail-like-count');
  
  const totalLikes = postLikes ? postLikes.length : 0;
  likeCountSpan.innerText = totalLikes;
  
  const isLikedByMe = STATE.session && STATE.session.user && postLikes
    ? postLikes.some(like => like.user_id === STATE.session.user.id)
    : false;
    
  if (isLikedByMe) {
    likeBtn.classList.add('liked');
  } else {
    likeBtn.classList.remove('liked');
  }
}

// 좋아요 추가/취소 토글
async function toggleLike() {
  if (!supabaseClient) return;
  if (!STATE.session) {
    showToast('좋아요를 누르려면 로그인이 필요합니다.', 'error');
    showAuthModal('login');
    return;
  }
  
  if (!loadedPostData) return;
  
  const postId = loadedPostData.id;
  const userId = STATE.session.user.id;
  
  const likeBtn = document.getElementById('btn-like-toggle');
  const isCurrentlyLiked = likeBtn.classList.contains('liked');
  
  try {
    if (isCurrentlyLiked) {
      // 좋아요 취소
      const { error } = await supabaseClient
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
        
      if (error) throw error;
      showToast('좋아요를 취소했습니다.', 'info');
    } else {
      // 좋아요 추가
      const { error } = await supabaseClient
        .from('post_likes')
        .insert([{ post_id: postId, user_id: userId }]);
        
      if (error) throw error;
      showToast('이 글을 좋아합니다! ❤️', 'success');
    }
    
    // 좋아요 상태 새로고침
    const { data: updatedLikes, error: fetchError } = await supabaseClient
      .from('post_likes')
      .select('id, user_id')
      .eq('post_id', postId);
      
    if (fetchError) throw fetchError;
    
    // 전역 캐시 업데이트 및 UI 갱신
    if (loadedPostData) {
      loadedPostData.post_likes = updatedLikes;
    }
    updateLikeUI(updatedLikes);
    
  } catch (error) {
    logError('Toggle Like', error);
    showToast('좋아요 처리에 실패했습니다.', 'error');
  }
}

// 8-4. 글쓰기 / 수정 폼 설정 및 전송
async function setupPostForm(id) {
  const formTitle = document.getElementById('form-section-title');
  const form = document.getElementById('blog-post-form');
  form.reset();
  
  // 이미지 업로드 UI 상태도 초기화
  document.getElementById('upload-status-message').innerText = '선택된 파일 없음';
  document.getElementById('upload-spinner-ui').style.display = 'none';
  document.getElementById('btn-trigger-upload').disabled = false;
  
  if (id) {
    // 수정 모드
    formTitle.innerText = '게시글 수정하기';
    document.getElementById('form-post-id').value = id;
    
    // 로드된 데이터가 있거나 새로 불러와야 하는 경우 처리
    try {
      let post = loadedPostData;
      if (!post || post.id !== id) {
        const { data, error } = await supabaseClient.from('posts').select('*').eq('id', id).single();
        if (error) throw error;
        post = data;
      }
      
      // 권한 검증 (본인 글 여부)
      if (post.author_id !== STATE.session.user.id) {
        showToast('본인의 글만 수정할 수 있습니다.', 'error');
        window.location.hash = ROUTE_HASH.LIST;
        return;
      }
      
      document.getElementById('select-post-category').value = post.category || 'general';
      document.getElementById('input-post-title').value = post.title;
      document.getElementById('textarea-post-content').value = post.content;
    } catch (error) {
      logError('Setup Edit Form', error);
      showToast('게시글 데이터를 가져오지 못했습니다.', 'error');
      window.location.hash = ROUTE_HASH.LIST;
    }
  } else {
    // 새 글 작성 모드
    formTitle.innerText = '새 글 작성하기';
    document.getElementById('form-post-id').value = '';
    // 기본 카테고리는 general(Blog)
    document.getElementById('select-post-category').value = 'general';
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  if (!supabaseClient || !STATE.session) return;
  
  const category = document.getElementById('select-post-category').value;
  const title = document.getElementById('input-post-title').value.trim();
  const content = document.getElementById('textarea-post-content').value.trim();
  const postId = document.getElementById('form-post-id').value;
  
  if (!title || !content) {
    showToast('제목과 본문을 모두 입력해 주세요.', 'error');
    return;
  }
  
  const submitBtn = document.getElementById('btn-form-submit');
  submitBtn.disabled = true;
  submitBtn.innerText = '저장 중...';
  
  try {
    if (postId) {
      // 수정 요청
      const { error } = await supabaseClient
        .from('posts')
        .update({ category, title, content })
        .eq('id', parseInt(postId));
        
      if (error) throw error;
      showToast('게시글이 수정되었습니다.', 'success');
      window.location.hash = `${ROUTE_HASH.DETAIL}${postId}`;
    } else {
      // 신규 등록 요청
      const { data, error } = await supabaseClient
        .from('posts')
        .insert([{
          category,
          title,
          content,
          author_id: STATE.session.user.id,
          author_email: STATE.session.user.email
        }])
        .select();
        
      if (error) throw error;
      showToast('게시글이 등록되었습니다.', 'success');
      
      if (data && data[0]) {
        window.location.hash = `${ROUTE_HASH.DETAIL}${data[0].id}`;
      } else {
        window.location.hash = ROUTE_HASH.LIST;
      }
    }
  } catch (error) {
    logError('Save Post', error);
    showToast('게시글 저장에 실패했습니다. DB 설정을 확인해 주세요.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = '저장하기';
  }
}

// 8-5. 글 삭제
async function deletePost() {
  if (!supabaseClient || !loadedPostData || !STATE.session) return;
  
  if (loadedPostData.author_id !== STATE.session.user.id) {
    showToast('본인 글만 삭제할 수 있습니다.', 'error');
    return;
  }
  
  if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;
  
  const id = loadedPostData.id;
  try {
    const { error } = await supabaseClient
      .from('posts')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    showToast('게시글이 성공적으로 삭제되었습니다.', 'success');
    window.location.hash = ROUTE_HASH.LIST;
  } catch (error) {
    logError('Delete Post', error);
    showToast('게시글 삭제 중 오류가 발생했습니다.', 'error');
  }
}

// 8-6. Supabase Storage 이미지 업로드 연동 로직
async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  // 로그인 검증
  if (!STATE.session || !STATE.session.user) {
    showToast('이미지를 업로드하려면 로그인이 필요합니다.', 'error');
    showAuthModal('login');
    return;
  }
  
  // 파일 타입 검증 (이미지만 허용)
  if (!file.type.startsWith('image/')) {
    showToast('이미지 파일만 업로드할 수 있습니다.', 'error');
    return;
  }
  
  const uploadButton = document.getElementById('btn-trigger-upload');
  const statusMessage = document.getElementById('upload-status-message');
  const spinner = document.getElementById('upload-spinner-ui');
  const contentTextarea = document.getElementById('textarea-post-content');
  
  // UI 비활성화 및 로딩 표시
  uploadButton.disabled = true;
  spinner.style.display = 'block';
  statusMessage.innerText = '이미지 업로드 중...';
  
  // 유니크한 업로드 파일명 경로 가공 (사용자 ID 폴더/타임스탬프_파일명)
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `${STATE.session.user.id}/${fileName}`;
  
  try {
    // Supabase Storage 버킷 'blog-attachments'로 파일 업로드
    const { data, error } = await supabaseClient.storage
      .from('blog-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) throw error;
    
    // 업로드된 파일의 Public URL 정보 가져오기
    const { data: { publicUrl } } = supabaseClient.storage
      .from('blog-attachments')
      .getPublicUrl(filePath);
      
    // 본문 textarea의 현재 커서(포커스) 위치에 마크다운 이미지 삽입
    const markdownImageTag = `\n![이미지 설명](${publicUrl})\n`;
    insertTextAtCursor(contentTextarea, markdownImageTag);
    
    statusMessage.innerText = `업로드 완료: ${file.name}`;
    showToast('이미지가 성공적으로 첨부되었습니다!', 'success');
  } catch (error) {
    logError('Image Upload to Storage', error);
    statusMessage.innerText = '업로드 실패';
    showToast('이미지 업로드 중 오류가 발생했습니다. Storage 설정을 확인해주세요.', 'error');
  } finally {
    uploadButton.disabled = false;
    spinner.style.display = 'none';
    // 다음 선택을 위해 파일 input 초기화
    e.target.value = '';
  }
}

// 텍스트 영역의 커서 위치에 문구를 삽입하는 헬퍼 함수
function insertTextAtCursor(textarea, textToInsert) {
  const startPos = textarea.selectionStart;
  const endPos = textarea.selectionEnd;
  const originalText = textarea.value;
  
  textarea.value = originalText.substring(0, startPos) + textToInsert + originalText.substring(endPos);
  
  // 삽입 완료 후 커서를 삽입된 문구의 끝 지점으로 이동 및 포커스 복원
  const nextCursorPos = startPos + textToInsert.length;
  textarea.selectionStart = textarea.selectionEnd = nextCursorPos;
  textarea.focus();
}

// 마크다운에서 첫 번째 이미지 URL을 파싱하는 정규식 함수
function extractFirstImageUrl(markdown) {
  if (!markdown) return null;
  const imgRegex = /!\[.*?\]\((.*?)\)/;
  const match = markdown.match(imgRegex);
  return match ? match[1] : null;
}

// ==========================================
// 8-7. 댓글 CRUD 추가 함수 정의
// ==========================================

// 댓글 목록 렌더링
function renderComments(comments) {
  const commentsCountSpan = document.getElementById('detail-comments-count');
  const commentsListContainer = document.getElementById('detail-comments-list');
  
  if (!commentsCountSpan || !commentsListContainer) return;
  
  commentsCountSpan.innerText = comments.length;
  commentsListContainer.innerHTML = '';
  
  if (comments.length === 0) {
    commentsListContainer.innerHTML = `<div class="comment-auth-fallback" style="border-style: dashed; padding: 2rem 1.25rem;">작성된 댓글이 없습니다. 첫 댓글을 남겨보세요!</div>`;
    return;
  }
  
  comments.forEach(comment => {
    const card = document.createElement('div');
    card.className = 'comment-card';
    
    // 작성자 닉네임 가공 (이메일 앞자리)
    const authorNickname = comment.author_email ? comment.author_email.split('@')[0] : '알 수 없음';
    
    // 현재 유저가 이 댓글의 주인인지 판단
    const isMyComment = STATE.session && STATE.session.user && comment.author_id === STATE.session.user.id;
    const deleteButtonHTML = isMyComment 
      ? `<button class="btn-comment-delete" onclick="deleteComment(${comment.id})">삭제</button>` 
      : '';
      
    card.innerHTML = `
      <div class="comment-header">
        <div class="comment-user-info">
          <span class="comment-author">${escapeHTML(authorNickname)}</span>
          <span class="comment-date">${formatDate(comment.created_at)}</span>
        </div>
        ${deleteButtonHTML}
      </div>
      <div class="comment-body">${escapeHTML(comment.content)}</div>
    `;
    commentsListContainer.appendChild(card);
  });
}

// 댓글 신규 등록 처리
async function submitComment(e) {
  e.preventDefault();
  if (!supabaseClient) return;
  if (!STATE.session || !STATE.session.user) {
    showToast('댓글을 작성하려면 로그인이 필요합니다.', 'error');
    showAuthModal('login');
    return;
  }
  
  if (!loadedPostData) return;
  
  const textarea = document.getElementById('textarea-comment-content');
  const content = textarea.value.trim();
  
  if (!content) {
    showToast('댓글 내용을 입력해주세요.', 'error');
    return;
  }
  
  const submitBtn = document.getElementById('btn-comment-submit');
  submitBtn.disabled = true;
  submitBtn.innerText = '등록 중...';
  
  try {
    const { error } = await supabaseClient
      .from('post_comments')
      .insert([{
        post_id: loadedPostData.id,
        author_id: STATE.session.user.id,
        author_email: STATE.session.user.email,
        content: content
      }]);
      
    if (error) throw error;
    
    textarea.value = '';
    showToast('댓글이 성공적으로 등록되었습니다.', 'success');
    
    // 댓글 목록 리프레시
    loadPostDetail(loadedPostData.id);
  } catch (error) {
    logError('Submit Comment', error);
    showToast('댓글 등록에 실패했습니다.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = '댓글 작성';
  }
}

// 댓글 삭제 처리 (전역 바인딩을 위해 window 객체에 등록)
window.deleteComment = async function(commentId) {
  if (!supabaseClient || !STATE.session) return;
  if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) return;
  
  try {
    const { error } = await supabaseClient
      .from('post_comments')
      .delete()
      .eq('id', commentId)
      .eq('author_id', STATE.session.user.id); // 보안 강화를 위해 내 아이디 조건 추가
      
    if (error) throw error;
    
    showToast('댓글이 성공적으로 삭제되었습니다.', 'success');
    
    // 댓글 목록 리프레시
    if (loadedPostData) {
      loadPostDetail(loadedPostData.id);
    }
  } catch (error) {
    logError('Delete Comment', error);
    showToast('댓글 삭제에 실패했습니다.', 'error');
  }
};

// 9. 유틸리티: HTML 이스케이프 (XSS 방지)
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 10. 이벤트 바인딩 및 초기화
function initApp() {
  // 10-1. Supabase 초기화 수행
  const initialized = initSupabase();
  
  // 10-2. 글로벌 버튼 및 양식 이벤트 리스너 바인딩
  document.getElementById('logo-btn').addEventListener('click', () => {
    window.location.hash = ROUTE_HASH.LIST;
  });
  
  document.getElementById('btn-show-login').addEventListener('click', () => {
    showAuthModal('login');
  });
  
  document.getElementById('btn-close-modal').addEventListener('click', hideAuthModal);
  
  // 모달 영역 외부 클릭 시 모달 닫기
  document.getElementById('auth-modal').addEventListener('click', (e) => {
    if (e.target.id === 'auth-modal') hideAuthModal();
  });
  
  document.getElementById('btn-toggle-auth-mode').addEventListener('click', () => {
    const nextMode = STATE.authMode === 'login' ? 'register' : 'login';
    showAuthModal(nextMode);
  });
  
  document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
  
  document.getElementById('btn-auth-logout').addEventListener('click', handleLogout);
  
  document.getElementById('btn-nav-write').addEventListener('click', () => {
    window.location.hash = ROUTE_HASH.WRITE;
  });
  
  document.getElementById('btn-back-to-list').addEventListener('click', () => {
    window.location.hash = ROUTE_HASH.LIST;
  });
  
  document.getElementById('btn-post-edit').addEventListener('click', () => {
    if (loadedPostData) {
      window.location.hash = `${ROUTE_HASH.EDIT}${loadedPostData.id}`;
    }
  });
  
  document.getElementById('btn-post-delete').addEventListener('click', deletePost);
  
  document.getElementById('btn-like-toggle').addEventListener('click', toggleLike);
  
  document.getElementById('blog-post-form').addEventListener('submit', handleFormSubmit);
  
  document.getElementById('btn-form-cancel').addEventListener('click', () => {
    if (document.getElementById('form-post-id').value) {
      window.location.hash = `${ROUTE_HASH.DETAIL}${document.getElementById('form-post-id').value}`;
    } else {
      window.location.hash = ROUTE_HASH.LIST;
    }
  });
  
  // 이미지 업로드 버튼 및 파일 인풋 이벤트 바인딩
  const imageInput = document.getElementById('input-post-image');
  const triggerButton = document.getElementById('btn-trigger-upload');
  
  if (triggerButton && imageInput) {
    triggerButton.addEventListener('click', () => {
      imageInput.click();
    });
    
    imageInput.addEventListener('change', handleImageUpload);
  }
  
  // 댓글 관련 이벤트 바인딩
  const commentForm = document.getElementById('comment-write-form');
  const commentLoginTrigger = document.getElementById('btn-comment-login-trigger');
  
  if (commentForm) {
    commentForm.addEventListener('submit', submitComment);
  }
  
  if (commentLoginTrigger) {
    commentLoginTrigger.addEventListener('click', () => {
      showAuthModal('login');
    });
  }
  
  // 10-3. Supabase Auth 세션 감지
  if (initialized && supabaseClient) {
    // 최초 실행 시 현재 세션 확인 및 설정
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      updateAuthUI(session);
      // 세션 정보를 불러온 다음 해시 변경 이벤트를 등록 및 최초 라우팅 처리
      window.addEventListener('hashchange', handleRouting);
      handleRouting();
    }).catch(error => {
      logError('Get Initial Session', error);
      window.addEventListener('hashchange', handleRouting);
      handleRouting();
    });
    
    // 로그인/로그아웃 상태 변화 실시간 리스너 등록
    supabaseClient.auth.onAuthStateChange((event, session) => {
      updateAuthUI(session);
    });
  } else {
    // Supabase 설정이 실패했더라도 기본적인 화면 처리가 되도록 라우터 셋업
    window.addEventListener('hashchange', handleRouting);
    handleRouting();
  }
}

// DOM 구성 완료 여부에 맞춰 안전하게 즉시 혹은 DOMContentLoaded 시점에 앱 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
