"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";

// 임시 워크스페이스 데이터 (나중에 API로 대체)
const mockWorkspaces = [
  {
    id: 1,
    name: "프로젝트 A",
    members: [
      { id: 1, name: "김철수", profileImg: null },
      { id: 2, name: "이영희", profileImg: null },
      { id: 3, name: "박민수", profileImg: null },
      { id: 4, name: "정수진", profileImg: null },
      { id: 5, name: "최동훈", profileImg: null },
    ],
    lastActive: "방금 전",
  },
  {
    id: 2,
    name: "디자인 팀",
    members: [
      { id: 6, name: "홍길동", profileImg: null },
      { id: 7, name: "김미래", profileImg: null },
      { id: 8, name: "이현우", profileImg: null },
    ],
    lastActive: "2시간 전",
  },
];

export default function WorkspacePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  const handleCloseModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowNewWorkspace(false);
      setIsClosingModal(false);
      setNewWorkspaceName("");
    }, 1000);
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <img
          src="/kor_eum_black.png"
          alt="Loading"
          className="w-12 h-12 animate-pulse"
        />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Background Images */}
      <img
        src="/workspace-left-top-background.png"
        alt=""
        className="fixed top-10 -left-10 h-[26vh] w-auto pointer-events-none select-none opacity-40"
      />
      <img
        src="/workspace-right-background.png"
        alt=""
        className="fixed bottom-0 -right-20 h-screen w-auto pointer-events-none select-none opacity-50"
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black/5">
        <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <img src="/eum_black.png" alt="EUM" className="h-6" />

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 hover:opacity-70 transition-opacity"
            >
              {user.profileImg ? (
                <img
                  src={user.profileImg}
                  alt={user.nickname}
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user.nickname.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white border border-black/10 shadow-lg z-20">
                  <div className="p-4 border-b border-black/5">
                    <p className="font-medium text-black">{user.nickname}</p>
                    <p className="text-sm text-black/50 mt-0.5">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left text-sm text-black/70 hover:bg-black/5 transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 relative z-10">
        <div className="max-w-4xl ml-8 lg:ml-16 xl:ml-24 px-8 py-16">
          {/* Greeting */}
          <div className="mb-16">
            <h1 className="text-4xl font-light text-black">
              안녕하세요, <span className="font-medium">{user.nickname}</span>님
            </h1>
            <p className="text-black/40 mt-2">워크스페이스를 선택하거나 새로 만들어보세요</p>
          </div>

          {/* Workspace Section */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-sm font-medium text-black/40 uppercase tracking-wider">
                내 워크스페이스
              </h2>
            </div>

            {/* Workspace Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* New Workspace Card */}
              <button
                className="group h-56 border-2 border-dashed border-black/10 hover:border-black/30 transition-all duration-300 flex flex-col items-center justify-center gap-4 hover:bg-black/[0.01]"
                onClick={() => setShowNewWorkspace(true)}
              >
                <img
                  src="/logo_black.png"
                  alt=""
                  className="w-12 h-12 object-contain opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-300"
                />
                <span className="text-sm text-black/35 group-hover:text-black/60 transition-colors duration-300">
                  새 워크스페이스
                </span>
              </button>

              {/* Workspace Cards */}
              {mockWorkspaces.map((workspace) => {
                const displayMembers = workspace.members.slice(0, 4);
                const remainingCount = workspace.members.length - 4;

                return (
                  <button
                    key={workspace.id}
                    className="group h-56 border border-black/10 hover:border-black/25 bg-white hover:shadow-lg transition-all duration-300 text-left p-7 flex flex-col justify-between"
                    onClick={() => {/* TODO: 워크스페이스 입장 */}}
                  >
                    <div>
                      <h3 className="text-xl font-medium text-black mb-6">
                        {workspace.name}
                      </h3>

                      {/* Member Avatars */}
                      <div className="flex items-center">
                        <div className="flex -space-x-2">
                          {displayMembers.map((member, index) => (
                            <div
                              key={member.id}
                              className="w-8 h-8 rounded-full border-2 border-white bg-black/10 flex items-center justify-center"
                              style={{ zIndex: displayMembers.length - index }}
                            >
                              {member.profileImg ? (
                                <img
                                  src={member.profileImg}
                                  alt={member.name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-xs font-medium text-black/50">
                                  {member.name.charAt(0)}
                                </span>
                              )}
                            </div>
                          ))}
                          {remainingCount > 0 && (
                            <div
                              className="w-8 h-8 rounded-full border-2 border-white bg-black flex items-center justify-center"
                              style={{ zIndex: 0 }}
                            >
                              <span className="text-xs font-medium text-white">
                                +{remainingCount}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-black/30">
                        {workspace.lastActive}
                      </span>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-black/5 transition-colors duration-300">
                        <svg
                          className="w-4 h-4 text-black/25 group-hover:text-black/50 group-hover:translate-x-0.5 transition-all duration-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Empty State (워크스페이스가 없을 때) */}
            {mockWorkspaces.length === 0 && (
              <div className="text-center py-16">
                <p className="text-black/30">아직 워크스페이스가 없습니다</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* New Workspace Modal */}
      {showNewWorkspace && (
        <div
          className={`fixed inset-0 z-[100] flex transition-transform duration-1000 ${
            isClosingModal ? 'translate-y-full' : 'animate-slide-up'
          }`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          {/* Left Side - Background Image */}
          <div className="w-[70%] h-full relative">
            <img
              src="/new-workspace-page-background.jpg"
              alt=""
              className="w-full h-full object-cover"
            />
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-8 left-8 w-10 h-10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Right Side - Form */}
          <div className="w-[30%] h-full bg-white flex flex-col justify-center px-12 border-l border-black/10">
            <div className="w-full">
              <p className="text-xs text-black/30 uppercase tracking-[0.2em] mb-2">
                CREATE WORKSPACE
              </p>
              <h2 className="text-2xl font-medium text-black mb-8">
                새 워크스페이스
              </h2>

              <div className="space-y-12">
                <div>
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="이름 입력"
                    className="no-focus-outline w-full py-3 text-lg text-black border-x-0 border-t-0 border-b border-black/10 bg-transparent placeholder:text-black/20"
                    autoFocus
                  />
                </div>

                {/* Next Button - Arrow style */}
                <button
                  onClick={() => {
                    if (newWorkspaceName.trim()) {
                      // TODO: 다음 단계 처리
                      console.log("Creating workspace:", newWorkspaceName);
                    }
                  }}
                  disabled={!newWorkspaceName.trim()}
                  className={`group flex items-center gap-3 transition-all duration-300 ${
                    newWorkspaceName.trim()
                      ? 'text-black cursor-pointer'
                      : 'text-black/20 cursor-not-allowed'
                  }`}
                >
                  <span className="text-sm font-medium tracking-wide">다음</span>
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${
                    newWorkspaceName.trim()
                      ? 'border-black group-hover:bg-black group-hover:text-white'
                      : 'border-black/20'
                  }`}>
                    <svg
                      className={`w-4 h-4 transition-transform duration-300 ${newWorkspaceName.trim() ? 'group-hover:translate-x-0.5' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
