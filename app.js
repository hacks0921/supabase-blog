/**
 * DevLog - 모던 블로그 & 게시판 SPA 비즈니스 로직 및 UI 연동 스크립트
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
  EDIT: '#edit/'
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
      toast.addEventListener('animationend', () => toast.remove());
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
  
  // 타겟 섹션 활성화 및 데이터 로딩
  if (viewName === 'list') {
    const listSec = document.getElementById('section-posts-list');
    listSec.classList.add('active');
    loadPosts();
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
  
  if (session && session.user) {
    // 로그인 상태
    displayEmail.innerText = session.user.email;
    userInfoArea.style.display = 'flex';
    showLoginBtn.style.display = 'none';
    navWriteBtn.style.display = 'inline-flex';
    logoutBtn.style.display = 'inline-flex';
  } else {
    // 로그아웃 상태
    userInfoArea.style.display = 'none';
    showLoginBtn.style.display = 'inline-flex';
    navWriteBtn.style.display = 'none';
    logoutBtn.style.display = 'none';
  }
  
  // 현재 상세 보기 페이지라면 본인 글일 시의 수정/삭제 버튼 노출 여부 다시 갱신
  if (STATE.currentView === 'detail') {
    updateDetailActionsVisibility();
  }
}

// 8. 게시글 데이터 연동 로직
// 8-1. 목록 조회
async function loadPosts() {
  if (!supabaseClient) return;
  
  const spinner = document.getElementById('posts-list-spinner');
  const gridContainer = document.getElementById('posts-grid-container');
  const emptyState = document.getElementById('posts-empty-state');
  
  spinner.style.display = 'flex';
  gridContainer.style.display = 'none';
  emptyState.style.display = 'none';
  
  try {
    // posts와 post_likes 관계를 조인하여 좋아요 레코드를 함께 가져옴
    const { data: posts, error } = await supabaseClient
      .from('posts')
      .select('*, post_likes(id, user_id)')
      .order('created_at', { ascending: false });
      
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
    // 1. 조회수 증가 비동기 호출 (실패하더라도 본문 열람을 위해 catch 처리)
    supabaseClient.rpc('increment_views', { post_id: id }).catch(err => {
      logError('Increment Views (RPC)', err);
    });
    
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
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  if (!supabaseClient || !STATE.session) return;
  
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
        .update({ title, content })
        .eq('id', parseInt(postId));
        
      if (error) throw error;
      showToast('게시글이 수정되었습니다.', 'success');
      window.location.hash = `${ROUTE_HASH.DETAIL}${postId}`;
    } else {
      // 신규 등록 요청
      const { data, error } = await supabaseClient
        .from('posts')
        .insert([{
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
    showToast('게시글 저장에 실패했습니다.', 'error');
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
document.addEventListener('DOMContentLoaded', () => {
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
});
