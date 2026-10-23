import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Person, FamilyTree, User, Gender } from '../../types';
import { 
  computeBotanicalTree, 
  BotanicalNode, 
  getCameraTransformForNode 
} from '../../lib/botanical-engine';
import { PersonProfileDrawer } from './PersonProfileDrawer';
import { searchArabicMatch } from '../../lib/arabic-utils';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Search, 
  Share2, 
  X,
  Plus,
  Eye,
  CheckCircle2,
  GitBranch,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Heart,
  Send,
  UserPlus,
  ArrowRight,
  Info
} from 'lucide-react';

interface TreeCanvasProps {
  tree: FamilyTree;
  people: Person[];
  currentUser: User | null;
  onAddRelativeDirect: (data: any, relativeToPerson: Person) => void;
  onNavigateToContribute: (branchRootPerson: Person) => void;
  onOpenShareModal: () => void;
  reviewFocusBranchId?: string;
}

export const TreeCanvas: React.FC<TreeCanvasProps> = ({
  tree,
  people,
  currentUser,
  onAddRelativeDirect,
  onNavigateToContribute,
  onOpenShareModal,
  reviewFocusBranchId
}) => {
  // Container & Viewport
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 1200, height: 800 });

  // Camera State (Tweened coordinates & scale)
  const [camera, setCamera] = useState<{ x: number; y: number; scale: number }>({
    x: 0,
    y: 0,
    scale: 0.68
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Semantic Zoom Level (0: Full Tree, 1: Major Branch, 2: Sub-Branch, 3: Individual Person)
  const [zoomLevel, setZoomLevel] = useState<0 | 1 | 2 | 3>(0);

  // Active / Selected Node
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusedBranchRootId, setFocusedBranchRootId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Breadcrumb Trail (e.g., [محمد, متروك, سالم])
  const [breadcrumb, setBreadcrumb] = useState<Array<{ id: string; name: string }>>([]);

  // Live Growing Sprouts (multi-generation additions during this session)
  const [localProposedPeople, setLocalProposedPeople] = useState<any[]>([]);
  const [newlySproutedId, setNewlySproutedId] = useState<string | null>(null);

  // Side Drawer / Action Panel for In-Tree Person Addition
  const [addPanelTargetNode, setAddPanelTargetNode] = useState<BotanicalNode | null>(null);
  const [addPanelRelation, setAddPanelRelation] = useState<'son' | 'daughter' | 'spouse'>('son');
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonFullName, setNewPersonFullName] = useState('');
  const [newPersonBirthYear, setNewPersonBirthYear] = useState('');
  const [newPersonBio, setNewPersonBio] = useState('');
  const [isAddingPerson, setIsAddingPerson] = useState(false);

  // Profile Drawer
  const [drawerPerson, setDrawerPerson] = useState<Person | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<Person[]>([]);

  // Update viewport dimensions on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewportSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Compute Data-driven Botanical Tree
  const botanicalTree = useMemo(() => {
    return computeBotanicalTree(
      people,
      localProposedPeople,
      tree.rootAncestorId,
      newlySproutedId
    );
  }, [people, localProposedPeople, tree.rootAncestorId, newlySproutedId]);

  // Map of nodes for instant lookup
  const nodeMap = useMemo(() => {
    const m = new Map<string, BotanicalNode>();
    botanicalTree.nodes.forEach(n => m.set(n.id, n));
    return m;
  }, [botanicalTree]);

  // Center Entire Tree (Level 0)
  const resetCameraToFullTree = useCallback(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth || 1200;
    const ch = containerRef.current.clientHeight || 800;

    // Center root around lower third of screen
    const targetScale = Math.min(cw / 2100, ch / 1500, 0.72);
    const targetX = cw / 2 - 1200 * targetScale;
    const targetY = ch / 2 - 820 * targetScale;

    setIsTransitioning(true);
    setCamera({ x: targetX, y: targetY, scale: targetScale });
    setZoomLevel(0);
    setSelectedNodeId(null);
    setFocusedBranchRootId(null);
    setBreadcrumb([{ id: tree.rootAncestorId, name: 'الجد المؤسس' }]);
    setTimeout(() => setIsTransitioning(false), 900);
  }, [tree.rootAncestorId]);

  // Initial Camera setup on mount
  useEffect(() => {
    resetCameraToFullTree();
  }, [resetCameraToFullTree]);

  // Auto-focus branch if opened from Review Queue
  useEffect(() => {
    if (reviewFocusBranchId && nodeMap.has(reviewFocusBranchId)) {
      const node = nodeMap.get(reviewFocusBranchId)!;
      focusOnNode(node, 'branch');
    }
  }, [reviewFocusBranchId, nodeMap]);

  // Re-build breadcrumb trail for selected node
  const updateBreadcrumbForNode = (node: BotanicalNode) => {
    const trail: Array<{ id: string; name: string }> = [];
    let curr: BotanicalNode | undefined = node;
    const visited = new Set<string>();

    while (curr && !visited.has(curr.id)) {
      visited.add(curr.id);
      trail.unshift({
        id: curr.id,
        name: curr.person.shortName || curr.person.fullName
      });

      if (curr.person.fatherId && nodeMap.has(curr.person.fatherId)) {
        curr = nodeMap.get(curr.person.fatherId);
      } else {
        break;
      }
    }
    setBreadcrumb(trail);
  };

  // Smooth Camera Navigation to any node
  const focusOnNode = (
    node: BotanicalNode,
    targetZoomType: 'branch' | 'subbranch' | 'person'
  ) => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth || 1200;
    const ch = containerRef.current.clientHeight || 800;

    const t = getCameraTransformForNode(node, cw, ch, targetZoomType);

    setIsTransitioning(true);
    setCamera(t);
    setSelectedNodeId(node.id);
    setFocusedBranchRootId(node.branchRootId);
    updateBreadcrumbForNode(node);

    if (targetZoomType === 'branch') setZoomLevel(1);
    else if (targetZoomType === 'subbranch') setZoomLevel(2);
    else setZoomLevel(3);

    setTimeout(() => setIsTransitioning(false), 900);
  };

  // Search handler
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchMatches([]);
      return;
    }
    const q = searchQuery.trim();
    const matches = people.filter(p =>
      searchArabicMatch(p.fullName, q) ||
      searchArabicMatch(p.shortName, q)
    );
    setSearchMatches(matches.slice(0, 6));
  }, [searchQuery, people]);

  // Mouse & Touch Pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCamera(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch panning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - camera.x,
        y: e.touches[0].clientY - camera.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setCamera(prev => ({
      ...prev,
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    }));
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.9;
    const newScale = Math.min(Math.max(camera.scale * zoomFactor, 0.4), 3.2);

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = mouseX - (mouseX - camera.x) * (newScale / camera.scale);
    const newY = mouseY - (mouseY - camera.y) * (newScale / camera.scale);

    setCamera({ x: newX, y: newY, scale: newScale });
  };

  // Confirm In-Tree Person Addition & Trigger Organic Branch Growth!
  const handleConfirmAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPanelTargetNode || !newPersonName.trim()) return;

    const targetPerson = addPanelTargetNode.person as Person;
    const tempId = `prop-${Date.now()}`;
    const gen = targetPerson.generation ? targetPerson.generation + 1 : 4;
    const isSon = addPanelRelation === 'son';

    const newProposed: any = {
      tempId,
      fullName: newPersonFullName.trim() || `${newPersonName.trim()} بن ${targetPerson.shortName}`,
      shortName: newPersonName.trim(),
      gender: isSon ? 'male' : 'female',
      relativeToId: targetPerson.id,
      relationship: addPanelRelation,
      generation: gen,
      birthYear: newPersonBirthYear ? parseInt(newPersonBirthYear) : undefined,
      biography: newPersonBio.trim() || undefined,
      isApproved: false
    };

    // If direct tree owner, also invoke direct add callback
    if (currentUser?.role === 'owner') {
      onAddRelativeDirect(
        {
          shortName: newPersonName.trim(),
          fullName: newProposed.fullName,
          gender: isSon ? 'male' : 'female',
          relationType: addPanelRelation,
          birthYear: newProposed.birthYear,
          biography: newProposed.biography
        },
        targetPerson
      );
    }

    // Append to local sprouts for animated growth
    setLocalProposedPeople(prev => [...prev, newProposed]);
    setNewlySproutedId(tempId);
    setIsAddingPerson(false);
    setNewPersonName('');
    setNewPersonFullName('');
    setNewPersonBirthYear('');
    setNewPersonBio('');

    // Smoothly focus camera onto the parent node to watch the new branch sprout!
    setTimeout(() => {
      focusOnNode(addPanelTargetNode, 'person');
    }, 150);
  };

  // Selected node reference
  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null;

  return (
    <div className="relative w-full h-[calc(100vh-80px)] overflow-hidden bg-[#FAF8F3] select-none text-right">
      
      {/* ========================================================
          LAYER 1: ATMOSPHERIC HORIZON & SUNLIGHT GRADIENTS
      ======================================================== */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 15%, rgba(235, 222, 195, 0.45) 0%, rgba(248, 245, 238, 0.95) 70%, #F5F0E6 100%)'
        }}
      />

      {/* Volumetric Sunray Pulses */}
      <div 
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1400px] h-[750px] pointer-events-none opacity-40 mix-blend-soft-light"
        style={{
          background: 'conic-gradient(from 180deg at 50% 0%, rgba(181, 154, 107, 0.25) 0deg, transparent 40deg, rgba(232, 220, 200, 0.4) 90deg, transparent 130deg, rgba(181, 154, 107, 0.25) 180deg)',
          filter: 'blur(50px)'
        }}
      />

      {/* ========================================================
          LAYER 2: TOP FLOATING NAVIGATION & CINEMATIC BREADCRUMBS
      ======================================================== */}
      <div className="absolute top-4 inset-x-4 sm:inset-x-8 z-30 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Search Bar with instant fly-to-branch */}
        <div className="relative pointer-events-auto w-full sm:w-80">
          <div className="relative">
            <Search className="w-4 h-4 text-[#687C58] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث عن فرد أو غصن..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/95 backdrop-blur-md border border-[#E8DCC8] text-[#202B26] text-xs font-medium pr-10 pl-8 py-2.5 rounded-full shadow-xs focus:border-[#B59A6B] focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#687C58] hover:text-[#16382F]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {searchMatches.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white border border-[#E8DCC8] rounded-2xl shadow-xl p-2 z-50 max-h-60 overflow-y-auto">
              <div className="text-[10px] text-[#687C58] font-bold px-2 py-1">
                نتائج البحث ({searchMatches.length}):
              </div>
              {searchMatches.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    if (nodeMap.has(m.id)) {
                      focusOnNode(nodeMap.get(m.id)!, 'person');
                      setSearchMatches([]);
                      setSearchQuery('');
                    }
                  }}
                  className="w-full text-right p-2 rounded-xl text-xs hover:bg-[#F8F5EE] transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-[#16382F] group-hover:text-[#B59A6B]">
                      {m.fullName}
                    </div>
                    <div className="text-[10px] text-[#687C58]">
                      الجيل {m.generation} • {m.gender === 'male' ? 'ذكر' : 'أنثى'}
                    </div>
                  </div>
                  <span className="text-[10px] text-[#B59A6B] font-semibold">تحليق للغصن</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cinematic Breadcrumb Trail */}
        <div className="pointer-events-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-[#E8DCC8] text-xs text-[#202B26] shadow-xs overflow-x-auto max-w-xl">
          <button
            onClick={resetCameraToFullTree}
            className={`font-semibold transition-colors flex items-center gap-1 ${
              zoomLevel === 0 ? 'text-[#16382F] font-bold' : 'text-[#687C58] hover:text-[#16382F]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-[#B59A6B]" />
            <span>عرض الشجرة كاملة</span>
          </button>

          {breadcrumb.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <span className="text-[#E8DCC8] font-light">←</span>
              <button
                onClick={() => {
                  if (nodeMap.has(crumb.id)) {
                    focusOnNode(nodeMap.get(crumb.id)!, idx === 0 ? 'branch' : 'person');
                  }
                }}
                className={`font-medium transition-colors truncate max-w-[140px] ${
                  idx === breadcrumb.length - 1 ? 'text-[#16382F] font-bold' : 'text-[#687C58] hover:text-[#16382F]'
                }`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Top Right Action Tools */}
        <div className="pointer-events-auto flex items-center gap-2">
          {localProposedPeople.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#B59A6B]/15 border border-[#B59A6B]/30 text-xs text-[#8C6D3B] font-semibold animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{localProposedPeople.length} إضافات قيد المراجعة</span>
            </div>
          )}

          <button
            onClick={onOpenShareModal}
            className="px-4 py-2 rounded-full bg-white hover:bg-[#F8F5EE] border border-[#E8DCC8] text-[#16382F] text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5 text-[#B59A6B]" />
            <span className="hidden sm:inline">مشاركة الشجرة</span>
          </button>
        </div>

      </div>

      {/* ========================================================
          LAYER 3: MAIN BOTANICAL SVG CANVAS WITH REAL LIVING TREE
      ======================================================== */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => setIsDragging(false)}
        onWheel={handleWheel}
        className={`w-full h-full relative cursor-grab overflow-hidden ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
      >
        {/* Transform Layer for Camera */}
        <div
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
            transformOrigin: '0 0',
            transition: isTransitioning ? 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)' : (isDragging ? 'none' : 'transform 0.1s ease-out')
          }}
          className="absolute inset-0 pointer-events-auto"
        >
          {/* Master Botanical Tree SVG Artwork */}
          <svg
            className="overflow-visible pointer-events-auto"
            style={{ width: 2400, height: 1600 }}
            viewBox="0 0 2400 1600"
          >
            <defs>
              {/* Bark Gradient for Natural Approved Trunk & Boughs */}
              <linearGradient id="trunkBarkGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#2E2319" />
                <stop offset="40%" stopColor="#42382C" />
                <stop offset="80%" stopColor="#5A4D3B" />
                <stop offset="100%" stopColor="#6E604B" />
              </linearGradient>

              {/* Glowing Warm Bronze Bark Gradient for Proposed Growth */}
              <linearGradient id="proposedBarkGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#B59A6B" />
                <stop offset="50%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#E5C158" />
              </linearGradient>

              {/* Sidr Leaf Gradient */}
              <linearGradient id="sidrLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7E946A" />
                <stop offset="100%" stopColor="#4A6338" />
              </linearGradient>

              {/* Proposed Sidr Leaf Gradient */}
              <linearGradient id="proposedLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E5C158" />
                <stop offset="100%" stopColor="#B59A6B" />
              </linearGradient>

              {/* Ground Shadow Filter */}
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
                <feOffset dx="0" dy="8" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.12" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Distant Canopy Foliage Clusters */}
            <g className="canopy-clouds pointer-events-none opacity-80">
              {botanicalTree.canopyClusters.map((cluster, idx) => (
                <ellipse
                  key={idx}
                  cx={cluster.cx}
                  cy={cluster.cy}
                  rx={cluster.rx}
                  ry={cluster.ry}
                  fill={cluster.color}
                  opacity={cluster.opacity}
                  filter="blur(24px)"
                />
              ))}
            </g>

            {/* Ground Soil Horizon & Roots */}
            <ellipse cx="1200" cy="1420" rx="420" ry="80" fill="#E8DCC8" opacity="0.5" filter="blur(16px)" />
            {botanicalTree.rootFlairPaths.map((rfPath, idx) => (
              <path
                key={idx}
                d={rfPath}
                fill="none"
                stroke="#42382C"
                strokeWidth={idx % 2 === 0 ? 16 : 10}
                strokeLinecap="round"
                opacity="0.85"
              />
            ))}

            {/* Master Organic Trunk */}
            <path
              d={botanicalTree.trunkPath}
              fill="url(#trunkBarkGrad)"
              filter="url(#softShadow)"
            />
            {/* Trunk Bark Texture Lines */}
            <path
              d="M 1180 1320 Q 1190 1150, 1195 980"
              fill="none"
              stroke="#2E2319"
              strokeWidth="2.5"
              opacity="0.5"
            />
            <path
              d="M 1215 1310 Q 1205 1170, 1208 1010"
              fill="none"
              stroke="#6E604B"
              strokeWidth="2"
              opacity="0.4"
            />

            {/* ====================================================
                BOTANICAL BRANCHES & TWIGS (Every Gen connected)
            ==================================================== */}
            {botanicalTree.nodes.filter(n => n.id !== tree.rootAncestorId).map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isFocusedBranch = focusedBranchRootId === node.branchRootId;
              const isProposed = node.isProposed;
              const isNewSprout = node.isNewSprout;

              return (
                <g 
                  key={node.id} 
                  className="branch-group cursor-pointer transition-opacity duration-300"
                  opacity={focusedBranchRootId && !isFocusedBranch ? 0.35 : 1}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextZoom = node.generation === 2 ? 'branch' : node.generation === 3 ? 'subbranch' : 'person';
                    focusOnNode(node, nextZoom);
                  }}
                >
                  {/* Invisible enlarged hit target for effortless branch clicking */}
                  <path
                    d={node.bezierPath}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={Math.max(node.branchThickness + 24, 36)}
                    strokeLinecap="round"
                  />

                  {/* Physical Organic Branch Stroke */}
                  <path
                    d={node.bezierPath}
                    fill="none"
                    stroke={
                      isProposed 
                        ? 'url(#proposedBarkGrad)' 
                        : isSelected 
                        ? '#B59A6B' 
                        : isHovered 
                        ? '#6E604B' 
                        : 'url(#trunkBarkGrad)'
                    }
                    strokeWidth={isSelected ? node.branchThickness + 3 : node.branchThickness}
                    strokeLinecap="round"
                    strokeDasharray={isProposed ? '8,4' : undefined}
                    filter="url(#softShadow)"
                    className={isNewSprout ? 'animate-dash-grow' : undefined}
                  />

                  {/* Highlights along top edge of branch for volume */}
                  <path
                    d={node.bezierPath}
                    fill="none"
                    stroke={isProposed ? '#FFF1C5' : '#8A7A64'}
                    strokeWidth={Math.max(node.branchThickness * 0.22, 1.5)}
                    strokeLinecap="round"
                    opacity={isSelected ? 0.9 : 0.45}
                  />

                  {/* Sidr Leaf Clusters at Tip of Branch */}
                  {node.leaves.map((leaf, lIdx) => (
                    <g
                      key={lIdx}
                      transform={`translate(${leaf.x}, ${leaf.y}) rotate(${leaf.angle}) scale(${leaf.scale})`}
                      className="transition-transform duration-500 origin-center"
                    >
                      <path
                        d="M 0 0 C 14 -18, 28 -8, 30 0 C 28 8, 14 18, 0 0 Z"
                        fill={
                          leaf.isSpouse 
                            ? '#C9A66B' 
                            : isProposed 
                            ? 'url(#proposedLeafGrad)' 
                            : 'url(#sidrLeafGrad)'
                        }
                        stroke={isProposed ? '#D4AF37' : '#3D542E'}
                        strokeWidth="1.2"
                        filter="url(#softShadow)"
                      />
                      {/* Central Leaf Vein */}
                      <path d="M 0 0 L 26 0" stroke={leaf.isSpouse ? '#FFE5A3' : '#9EB88A'} strokeWidth="0.8" opacity="0.75" />
                    </g>
                  ))}
                </g>
              );
            })}

            {/* ====================================================
                FOUNDING ANCESTOR PLAQUE AT TRUNK (Root Seal)
            ==================================================== */}
            <g
              transform={`translate(${botanicalTree.rootNode.x}, ${botanicalTree.rootNode.y + 40})`}
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                focusOnNode(botanicalTree.rootNode, 'person');
              }}
            >
              <rect
                x="-140"
                y="-32"
                width="280"
                height="64"
                rx="32"
                fill="#16382F"
                stroke="#B59A6B"
                strokeWidth="2.5"
                filter="url(#softShadow)"
              />
              <circle cx="-100" cy="0" r="18" fill="#B59A6B" />
              <text x="-100" y="5" textAnchor="middle" fill="#16382F" fontSize="13" fontWeight="bold">
                أصل
              </text>
              <text x="15" y="-6" textAnchor="middle" fill="#F8F5EE" fontSize="14" fontWeight="bold" fontFamily="Alexandria">
                {tree.name}
              </text>
              <text x="15" y="16" textAnchor="middle" fill="#B59A6B" fontSize="11" fontWeight="medium" fontFamily="IBM Plex Sans Arabic">
                {botanicalTree.rootNode.person.fullName}
              </text>
            </g>

            {/* ====================================================
                SEMANTIC CALLIGRAPHIC BANNERS (Level 0 Overview)
            ==================================================== */}
            {zoomLevel === 0 && (
              <g className="major-branch-banners pointer-events-auto">
                {botanicalTree.nodes.filter(n => n.generation === 2).map(bNode => (
                  <g
                    key={bNode.id}
                    transform={`translate(${bNode.x}, ${bNode.y - 45})`}
                    className="cursor-pointer group animate-fade-in"
                    onClick={(e) => {
                      e.stopPropagation();
                      focusOnNode(bNode, 'branch');
                    }}
                  >
                    <rect
                      x="-85"
                      y="-22"
                      width="170"
                      height="44"
                      rx="22"
                      fill="#FFFFFF"
                      stroke="#B59A6B"
                      strokeWidth="2"
                      filter="url(#softShadow)"
                      className="group-hover:fill-[#16382F] transition-colors"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#16382F"
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="Alexandria"
                      className="group-hover:fill-[#F8F5EE] transition-colors"
                    >
                      غصن {bNode.person.shortName}
                    </text>
                    <text
                      x="0"
                      y="28"
                      textAnchor="middle"
                      fill="#687C58"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      انقر للتحليق والغوص في الغصن ↓
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* ====================================================
                INDIVIDUAL NAME MARKERS & INTERACTIVE PETALS (Level 1, 2, 3)
            ==================================================== */}
            {zoomLevel > 0 && botanicalTree.nodes.filter(n => n.id !== tree.rootAncestorId).map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isMale = node.person.gender === 'male';

              // Reveal labels progressively
              const showLabel = 
                isSelected || 
                isHovered || 
                node.generation <= 3 || 
                zoomLevel >= 2;

              if (!showLabel) return null;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    focusOnNode(node, 'person');
                  }}
                >
                  {/* Subtle Node Medallion */}
                  <circle
                    cx="0"
                    cy="0"
                    r={isSelected ? "18" : "13"}
                    fill={node.isProposed ? '#B59A6B' : isMale ? '#16382F' : '#5C3D38'}
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    filter="url(#softShadow)"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize={isSelected ? "11" : "9"}
                    fontWeight="bold"
                    fontFamily="Alexandria"
                  >
                    {node.person.shortName ? node.person.shortName.charAt(0) : 'ف'}
                  </text>

                  {/* Refined Arabic Name Tag */}
                  <g transform={`translate(${node.parentAngle > 0 ? 22 : -22}, -8)`}>
                    <rect
                      x={node.parentAngle > 0 ? "0" : "-140"}
                      y="-12"
                      width="140"
                      height="26"
                      rx="13"
                      fill={isSelected ? '#16382F' : node.isProposed ? '#FDF8EC' : '#FFFFFF'}
                      stroke={isSelected ? '#B59A6B' : node.isProposed ? '#B59A6B' : '#E8DCC8'}
                      strokeWidth={isSelected ? "1.8" : "1"}
                      filter="url(#softShadow)"
                    />
                    <text
                      x={node.parentAngle > 0 ? "70" : "-70"}
                      y="5"
                      textAnchor="middle"
                      fill={isSelected ? '#FFFFFF' : '#16382F'}
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="Alexandria"
                    >
                      {node.person.shortName}
                    </text>
                  </g>

                  {/* Proposed Growth Pill */}
                  {node.isProposed && (
                    <g transform="translate(0, 24)">
                      <rect x="-35" y="-8" width="70" height="16" rx="8" fill="#B59A6B" />
                      <text x="0" y="4" textAnchor="middle" fill="#16382F" fontSize="8" fontWeight="bold">
                        مقترح جديد
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* ========================================================
          LAYER 4: CONTEXTUAL ACTION PETALS (When Person is Selected at Level 3)
      ======================================================== */}
      {selectedNode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-md border border-[#E8DCC8] rounded-full p-2 shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 pr-3 pl-2 border-l border-[#E8DCC8]">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
              selectedNode.person.gender === 'male' ? 'bg-[#16382F]' : 'bg-[#5C3D38]'
            }`}>
              {selectedNode.person.shortName?.charAt(0)}
            </div>
            <div className="text-right">
              <div className="font-bold text-xs text-[#16382F]">{selectedNode.person.shortName}</div>
              <div className="text-[10px] text-[#687C58]">الجيل {selectedNode.generation}</div>
            </div>
          </div>

          <button
            onClick={() => {
              if ('biography' in selectedNode.person) {
                setDrawerPerson(selectedNode.person as Person);
              }
            }}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#16382F] hover:bg-[#F8F5EE] border border-[#E8DCC8] transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-[#B59A6B]" />
            <span>عرض الملف</span>
          </button>

          <button
            onClick={() => {
              setAddPanelTargetNode(selectedNode);
              setAddPanelRelation('son');
              setIsAddingPerson(true);
            }}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#16382F] text-white hover:bg-[#20493E] shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#B59A6B]" />
            <span>إضافة ابن</span>
          </button>

          <button
            onClick={() => {
              setAddPanelTargetNode(selectedNode);
              setAddPanelRelation('daughter');
              setIsAddingPerson(true);
            }}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#8C6D3B] text-white hover:bg-[#775c31] shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة ابنة</span>
          </button>

          <button
            onClick={() => {
              setAddPanelTargetNode(selectedNode);
              setAddPanelRelation('spouse');
              setIsAddingPerson(true);
            }}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#4A5D53] hover:bg-[#F8F5EE] border border-[#E8DCC8] transition-colors flex items-center gap-1.5"
          >
            <Heart className="w-3.5 h-3.5 text-[#B59A6B]" />
            <span>إضافة زوج / زوجة</span>
          </button>
        </div>
      )}

      {/* ========================================================
          LAYER 5: FLOATING CAMERA CONTROLS (Bottom Right)
      ======================================================== */}
      <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md border border-[#E8DCC8] rounded-2xl p-1 shadow-md flex flex-col gap-1">
          <button
            onClick={() => setCamera(c => ({ ...c, scale: Math.min(c.scale + 0.25, 3.2) }))}
            title="تكبير (+)"
            className="p-2.5 rounded-xl text-[#687C58] hover:text-[#16382F] hover:bg-[#F8F5EE] transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCamera(c => ({ ...c, scale: Math.max(c.scale - 0.25, 0.4) }))}
            title="تصغير (-)"
            className="p-2.5 rounded-xl text-[#687C58] hover:text-[#16382F] hover:bg-[#F8F5EE] transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetCameraToFullTree}
            title="عرض الشجرة كاملة"
            className="p-2.5 rounded-xl text-[#687C58] hover:text-[#16382F] hover:bg-[#F8F5EE] transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================
          LAYER 6: IN-TREE ADD PERSON DRAWER (Tree remains visible!)
      ======================================================== */}
      {isAddingPerson && addPanelTargetNode && (
        <div className="absolute top-0 bottom-0 left-0 w-full sm:w-96 bg-white/95 backdrop-blur-xl border-r border-[#E8DCC8] shadow-2xl z-50 p-6 flex flex-col justify-between animate-in slide-in-from-left duration-300">
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DCC8]">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#8C6D3B] font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-[#B59A6B]" />
                  <span>تفرع غصن جديد مباشرة على الشجرة</span>
                </div>
                <h3 className="text-base font-bold text-[#16382F] mt-0.5">
                  إضافة فرد تحت: {addPanelTargetNode.person.shortName}
                </h3>
              </div>
              <button
                onClick={() => setIsAddingPerson(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F8F5EE] flex items-center justify-center text-[#687C58]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddPerson} className="space-y-4">
              <div>
                <label className="text-xs text-[#4A5D53] block mb-1.5 font-medium">نوع العلاقة:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddPanelRelation('son')}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                      addPanelRelation === 'son' ? 'bg-[#16382F] text-white' : 'bg-[#F8F5EE] text-[#4A5D53] border border-[#E8DCC8]'
                    }`}
                  >
                    ابن
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddPanelRelation('daughter')}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                      addPanelRelation === 'daughter' ? 'bg-[#8C6D3B] text-white' : 'bg-[#F8F5EE] text-[#4A5D53] border border-[#E8DCC8]'
                    }`}
                  >
                    ابنة
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddPanelRelation('spouse')}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                      addPanelRelation === 'spouse' ? 'bg-[#B59A6B] text-[#16382F]' : 'bg-[#F8F5EE] text-[#4A5D53] border border-[#E8DCC8]'
                    }`}
                  >
                    زوج / زوجة
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#4A5D53] block mb-1.5 font-medium">الاسم المختصر (مطلوب):</label>
                <input
                  type="text"
                  placeholder="مثال: فهد"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#16382F] font-bold focus:border-[#16382F] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-[#4A5D53] block mb-1.5 font-medium">الاسم الكامل (اختياري):</label>
                <input
                  type="text"
                  placeholder={`فهد بن ${addPanelTargetNode.person.shortName}`}
                  value={newPersonFullName}
                  onChange={(e) => setNewPersonFullName(e.target.value)}
                  className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#16382F] focus:border-[#16382F] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-[#4A5D53] block mb-1.5 font-medium">سنة الميلاد (اختياري):</label>
                <input
                  type="number"
                  placeholder="مثال: 1998"
                  value={newPersonBirthYear}
                  onChange={(e) => setNewPersonBirthYear(e.target.value)}
                  className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#16382F] focus:border-[#16382F] focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-[#F8F5EE] border border-[#E8DCC8] text-[11px] text-[#4A5D53] flex items-start gap-2">
                <Info className="w-4 h-4 text-[#B59A6B] shrink-0 mt-0.5" />
                <span>
                  عند التأكيد، سينمو غصن نباتي جديد فوراً من شجرة العائلة وسينبثق اسم الفرد بورقة سدر خضراء!
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-[#16382F] hover:bg-[#20493E] text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4 text-[#B59A6B]" />
                  <span>إضافة إلى الغصن ورؤية نموه الآن</span>
                </button>
              </div>
            </form>
          </div>

          <div className="text-[11px] text-[#687C58] text-center pt-4 border-t border-[#E8DCC8]">
            تبقى الشجرة التفاعلية حية في الخلفية مع كل نمو جديد
          </div>
        </div>
      )}

      {/* ========================================================
          LAYER 7: PERSON PROFILE DRAWER
      ======================================================== */}
      {drawerPerson && (
        <PersonProfileDrawer
          person={drawerPerson}
          people={people}
          onClose={() => setDrawerPerson(null)}
          onSelectPerson={(p: Person) => {
            setDrawerPerson(p);
            if (nodeMap.has(p.id)) {
              focusOnNode(nodeMap.get(p.id)!, 'person');
            }
          }}
          onAddRelative={(targetP: Person) => {
            if (nodeMap.has(targetP.id)) {
              setDrawerPerson(null);
              setAddPanelTargetNode(nodeMap.get(targetP.id)!);
              setAddPanelRelation('son');
              setIsAddingPerson(true);
            }
          }}
          onProposeBranch={(targetP: Person) => {
            onNavigateToContribute(targetP);
          }}
        />
      )}

    </div>
  );
};
