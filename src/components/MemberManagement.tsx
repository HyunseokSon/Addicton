import { useState, useMemo, useCallback } from 'react';
import { Member, Gender, Rank, Player } from '../types/index';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { UserPlus, Edit2, Trash2, Check, X, UserCheck, CheckCircle2, Search, Filter, Users, Database } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import React from 'react';
import { toast } from 'sonner';
import { membersApi } from '../utils/api/membersApi';
import { AddMemberDialog } from './AddMemberDialog';

interface MemberManagementProps {
  members: Member[];
  players: Player[];
  onAddMember: (name: string, gender?: Gender, rank?: Rank) => void;
  onUpdateMember: (id: string, updates: Partial<Member>) => void;
  onDeleteMember: (id: string) => void;
  onAddMemberAsPlayer: (memberId: string) => void;
  addMembersAsPlayers: (memberIds: string[]) => Promise<number>;
  syncFromSupabase: () => Promise<boolean>;
  resetMembers: () => Promise<number>;
  setLoadingModal: React.Dispatch<React.SetStateAction<{
    open: boolean;
    title: string;
    description?: string;
    status: 'loading' | 'success' | 'error';
    errorMessage?: string;
  }>>;
  readOnly?: boolean;
}

export function MemberManagement({
  members,
  players,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onAddMemberAsPlayer,
  addMembersAsPlayers,
  syncFromSupabase,
  resetMembers,
  setLoadingModal,
  readOnly,
}: MemberManagementProps) {
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender | ''>('');
  const [newRank, setNewRank] = useState<Rank | ''>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingGender, setEditingGender] = useState<Gender | ''>('');
  const [editingRank, setEditingRank] = useState<Rank | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'registered' | 'notRegistered'>('all');
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [isBatchAdding, setIsBatchAdding] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);

  // Check if a member is already registered as a player
  const isMemberRegistered = (memberName: string) => {
    return players.some(player => player.name === memberName);
  };

  // Filter members based on search and status
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Search filter
      const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const isRegistered = isMemberRegistered(member.name);
      const matchesStatus = 
        filterStatus === 'all' ||
        (filterStatus === 'registered' && isRegistered) ||
        (filterStatus === 'notRegistered' && !isRegistered);
      
      return matchesSearch && matchesStatus;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [members, searchQuery, filterStatus, players]);

  // Get unregistered members from filtered list
  const unregisteredMembers = useMemo(() => {
    return filteredMembers.filter(m => !isMemberRegistered(m.name));
  }, [filteredMembers, players]);

  const handleAdd = () => {
    if (newName.trim()) {
      onAddMember(
        newName.trim(),
        newGender || undefined,
        newRank || undefined
      );
      setNewName('');
      setNewGender('');
      setNewRank('');
    }
  };

  const handleStartEdit = (member: Member) => {
    setEditingId(member.id);
    setEditingName(member.name);
    setEditingGender(member.gender || '');
    setEditingRank(member.rank || '');
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      onUpdateMember(editingId, {
        name: editingName.trim(),
        gender: editingGender || undefined,
        rank: editingRank || undefined,
      });
      setEditingId(null);
      setEditingName('');
      setEditingGender('');
      setEditingRank('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingGender('');
    setEditingRank('');
  };

  const handleToggleSelect = (memberId: string) => {
    setSelectedMemberIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedMemberIds.size === unregisteredMembers.length) {
      // Deselect all
      setSelectedMemberIds(new Set());
    } else {
      // Select all unregistered members
      setSelectedMemberIds(new Set(unregisteredMembers.map(m => m.id)));
    }
  };

  const handleBatchAdd = async () => {
    if (selectedMemberIds.size === 0) return;
    
    try {
      toast.loading(`${selectedMemberIds.size}명의 모임원을 참가 등록하고 있습니다...`, { id: 'batch-add' });
      
      const count = await addMembersAsPlayers(Array.from(selectedMemberIds));
      
      toast.loading(`${count}명이 등록되었습니다. 데이터를 새로고침합니다...`, { id: 'batch-add' });

      // Auto sync to reflect changes
      await syncFromSupabase();

      toast.success(`${count}명이 참가 등록되었습니다.`, { id: 'batch-add' });

      setSelectedMemberIds(new Set());

    } catch (error) {
      console.error('Batch add failed:', error);
      toast.error('등록 중 오류가 발생했습니다. 다시 시도해주세요.', { id: 'batch-add' });
    }
  };

  const handleResetMembers = async () => {
    if (!confirm('⚠️ 경고!\n\n모든 모임원과 참가자 정보가 삭제되고,\n70명의 새로운 모임원 데이터로 초기화됩니다.\n\n정말 초기화하시겠습니까?')) {
      return;
    }

    // Show loading modal
    setLoadingModal({
      open: true,
      title: '모임원 DB 초기화 중',
      description: '기존 모임원과 참가자를 삭제하고 있습니다...',
      status: 'loading',
    });

    try {
      const count = await resetMembers();
      
      // Update loading modal with sync message
      setLoadingModal({
        open: true,
        title: '모임원 DB 초기화 중',
        description: `${count}명의 새로운 모임원이 추가되었습니다. 데이터를 새로고침합니다...`,
        status: 'loading',
      });

      // Auto sync to reflect changes
      await syncFromSupabase();

      // Show success
      setLoadingModal({
        open: true,
        title: '초기화 완료',
        description: `${count}명의 새로운 모임원이 등록되었습니다.`,
        status: 'success',
      });

      // Auto close after 2 seconds
      setTimeout(() => {
        setLoadingModal(prev => ({ ...prev, open: false }));
      }, 2000);

    } catch (error) {
      console.error('Reset members failed:', error);
      setLoadingModal({
        open: true,
        title: '초기화 실패',
        status: 'error',
        errorMessage: '초기화 중 오류가 발생했습니다. 다시 시도해주세요.',
      });
    }
  };

  const handleMigrateGender = async () => {
    if (!confirm('DB의 성별 데이터를 한글로 변환하시겠습니까?\n\nmale → 남\nfemale → 녀')) {
      return;
    }

    // Show loading modal
    setLoadingModal({
      open: true,
      title: '성별 데이터 변환 중',
      description: '모임원과 참가자의 성별 데이터를 변환하고 있습니다...',
      status: 'loading',
    });

    try {
      const { membersUpdated, playersUpdated } = await membersApi.migrateGender();
      
      // Update loading modal with sync message
      setLoadingModal({
        open: true,
        title: '성별 데이터 변환 중',
        description: `모임원 ${membersUpdated}명, 참가자 ${playersUpdated}명이 업데이트되었습니다. 데이터를 새로고침합니다...`,
        status: 'loading',
      });

      // Auto sync to reflect changes
      await syncFromSupabase();

      // Show success
      setLoadingModal({
        open: true,
        title: '변환 완료',
        description: `성별 데이터가 한글로 변환되었습니다.\n모임원: ${membersUpdated}명, 참가자: ${playersUpdated}명`,
        status: 'success',
      });

      // Auto close after 2 seconds
      setTimeout(() => {
        setLoadingModal(prev => ({ ...prev, open: false }));
      }, 2000);

    } catch (error) {
      console.error('Gender migration failed:', error);
      setLoadingModal({
        open: true,
        title: '변환 실패',
        status: 'error',
        errorMessage: '변환 중 오류가 발생했습니다. 다시 시도해주세요.',
      });
    }
  };

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Members List */}
      <div>
        <div className="flex items-center justify-between mb-2.5 md:mb-3">
          <h3 className="font-semibold text-xs md:text-sm text-gray-700">등록된 모임원</h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] md:text-xs px-2 py-0.5 shadow-sm">
              {filteredMembers.length}/{members.length}명
            </Badge>
            {!readOnly && (
              <Button
                onClick={() => setShowAddMemberDialog(true)}
                className="h-7 md:h-8 px-2.5 md:px-3 bg-blue-600 hover:bg-blue-700 text-[10px] md:text-xs shadow-sm"
              >
                <UserPlus className="size-3 md:size-3.5 mr-1 md:mr-1.5" />
                모임원 추가
              </Button>
            )}
          </div>
        </div>
        
        {/* Batch Add Button */}
        {!readOnly && unregisteredMembers.length > 0 && (
          <div className="mb-2.5 md:mb-3 flex items-center gap-2">
            <label
              className="flex items-center gap-1.5 px-3 py-2 h-8 md:h-9 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer text-[10px] md:text-xs transition-colors"
            >
              <Checkbox
                checked={selectedMemberIds.size === unregisteredMembers.length && unregisteredMembers.length > 0}
                onCheckedChange={handleSelectAll}
              />
              전체선택
            </label>
            {selectedMemberIds.size > 0 && (
              <Button
                onClick={handleBatchAdd}
                disabled={isBatchAdding}
                className="flex-1 h-8 md:h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] md:text-xs shadow-sm"
              >
                <Users className="size-3 md:size-3.5 mr-1.5" />
                {isBatchAdding ? '등록 중...' : `일괄 참가 (${selectedMemberIds.size}명)`}
              </Button>
            )}
          </div>
        )}
        
        {/* Search and Filter */}
        <div className="space-y-2 mb-2.5 md:mb-3">
          <div className="relative">
            <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 size-3.5 md:size-4 text-gray-400" />
            <Input
              type="text"
              placeholder="이름 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 md:pl-9 h-9 md:h-10 text-xs md:text-sm"
            />
          </div>
          <ToggleGroup
            type="single"
            value={filterStatus}
            onValueChange={(value) => value && setFilterStatus(value as any)}
            className="justify-start gap-1.5"
          >
            <ToggleGroupItem value="all" className="text-[10px] md:text-xs h-7 md:h-8 px-2.5 md:px-3">
              전체
            </ToggleGroupItem>
            <ToggleGroupItem value="registered" className="text-[10px] md:text-xs h-7 md:h-8 px-2.5 md:px-3">
              참가중
            </ToggleGroupItem>
            <ToggleGroupItem value="notRegistered" className="text-[10px] md:text-xs h-7 md:h-8 px-2.5 md:px-3">
              미참가
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        <div className="space-y-1.5 md:space-y-2 max-h-[400px] md:max-h-[500px] overflow-y-auto pr-1">
          {filteredMembers.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 md:p-8 text-center">
              <p className="text-xs md:text-sm text-gray-400">
                {searchQuery || filterStatus !== 'all' 
                  ? '검색 결과가 없습니다' 
                  : '등록된 모임원이 없습니다'}
              </p>
            </div>
          ) : (
            <>
              {filteredMembers.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  isRegistered={isMemberRegistered(member.name)}
                  isSelected={selectedMemberIds.has(member.id)}
                  isEditing={editingId === member.id}
                  editingName={editingName}
                  editingGender={editingGender}
                  editingRank={editingRank}
                  onStartEdit={handleStartEdit}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onEditNameChange={setEditingName}
                  onEditGenderChange={setEditingGender}
                  onEditRankChange={setEditingRank}
                  onToggleSelect={handleToggleSelect}
                  onAddMemberAsPlayer={onAddMemberAsPlayer}
                  onDeleteMember={onDeleteMember}
                  setLoadingModal={setLoadingModal}
                  readOnly={readOnly}
                />
              ))}
              {/* Bottom padding spacer for scroll area */}
              <div className="h-2"></div>
            </>
          )}
        </div>
      </div>

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={showAddMemberDialog}
        onOpenChange={setShowAddMemberDialog}
        onAddMember={onAddMember}
      />
    </div>
  );
}

interface MemberCardProps {
  member: Member;
  isRegistered: boolean;
  isSelected: boolean;
  isEditing: boolean;
  editingName: string;
  editingGender: Gender | '';
  editingRank: Rank | '';
  onStartEdit: (member: Member) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (name: string) => void;
  onEditGenderChange: (gender: Gender | '') => void;
  onEditRankChange: (rank: Rank | '') => void;
  onToggleSelect: (memberId: string) => void;
  onAddMemberAsPlayer: (memberId: string) => void;
  onDeleteMember: (memberId: string) => void;
  setLoadingModal: React.Dispatch<React.SetStateAction<{
    open: boolean;
    title: string;
    description?: string;
    status: 'loading' | 'success' | 'error';
    errorMessage?: string;
  }>>;
  readOnly?: boolean;
}

const MemberCard = React.memo(function MemberCard({
  member,
  isRegistered,
  isSelected,
  isEditing,
  editingName,
  editingGender,
  editingRank,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditNameChange,
  onEditGenderChange,
  onEditRankChange,
  onToggleSelect,
  onAddMemberAsPlayer,
  onDeleteMember,
  setLoadingModal,
  readOnly,
}: MemberCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2.5 md:p-3 hover:shadow-sm transition-all">
      {isEditing ? (
        <div className="space-y-2">
          <Input
            type="text"
            value={editingName}
            onChange={(e) => onEditNameChange(e.target.value)}
            className="w-full h-8 md:h-9 text-xs md:text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Select
              value={editingGender}
              onValueChange={(value) => onEditGenderChange(value as Gender)}
            >
              <SelectTrigger className="flex-1 h-8 md:h-9 text-xs md:text-sm">
                <SelectValue placeholder="성별" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="남">남</SelectItem>
                <SelectItem value="녀">녀</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={editingRank}
              onValueChange={(value) => onEditRankChange(value as Rank)}
            >
              <SelectTrigger className="flex-1 h-8 md:h-9 text-xs md:text-sm">
                <SelectValue placeholder="급수" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="S">S</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
                <SelectItem value="E">E</SelectItem>
                <SelectItem value="F">F</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onSaveEdit}
              className="flex-1 h-8 md:h-9 text-[10px] md:text-xs active:scale-95 touch-manipulation"
            >
              <Check className="size-3 md:size-3.5 mr-1" />
              저장
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancelEdit}
              className="flex-1 h-8 md:h-9 text-[10px] md:text-xs active:scale-95 touch-manipulation"
            >
              <X className="size-3 md:size-3.5 mr-1" />
              취소
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
              {/* Checkbox for unregistered members */}
              {!readOnly && !isRegistered && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelect(member.id)}
                  className="shrink-0"
                />
              )}
              <span className="font-medium text-xs md:text-sm truncate">{member.name}</span>
              {member.gender && (
                <Badge variant="outline" className="text-[9px] md:text-xs px-1.5 py-0">
                  {member.gender}
                </Badge>
              )}
              {member.rank && (
                <Badge variant="outline" className="text-[9px] md:text-xs px-1.5 py-0 bg-amber-50 border-amber-300 text-amber-700">
                  {member.rank}
                </Badge>
              )}
              {isRegistered && (
                <Badge className="text-[9px] md:text-xs px-1.5 py-0 bg-emerald-100 border-emerald-300 text-emerald-700">
                  <CheckCircle2 className="size-2.5 md:size-3 mr-0.5" />
                  참가중
                </Badge>
              )}
            </div>
            {!readOnly && (
              <div className="flex items-center gap-0.5 md:gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onStartEdit(member)}
                  className="size-7 md:size-8 p-0 hover:bg-blue-50 active:scale-90 touch-manipulation"
                  title="수정"
                >
                  <Edit2 className="size-3 md:size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteMember(member.id)}
                  className="size-7 md:size-8 p-0 hover:bg-red-50 active:scale-90 touch-manipulation"
                  title="삭제"
                >
                  <Trash2 className="size-3 md:size-3.5 text-red-600" />
                </Button>
              </div>
            )}
          </div>
          {isRegistered ? (
            <div className="w-full px-2.5 md:px-3 py-1.5 md:py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <span className="text-[10px] md:text-xs text-emerald-700 font-medium">✓ 참가 등록 완료</span>
            </div>
          ) : (
            !readOnly && !isSelected && (
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    toast.loading(`${member.name}님을 참가자로 등록하고 있습니다...`, { id: `add-${member.id}` });
                    
                    await onAddMemberAsPlayer(member.id);
                    
                    toast.success(`${member.name}님이 참가자로 등록되었습니다.`, { id: `add-${member.id}` });
                  } catch (error) {
                    console.error('Failed to add member as player:', error);
                    toast.error('등록 중 오류가 발생했습니다. 다시 시도해주세요.', { id: `add-${member.id}` });
                  }
                }}
                className="w-full h-8 md:h-9 bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-sm text-[10px] md:text-xs touch-manipulation"
              >
                <UserCheck className="size-3 md:size-3.5 mr-1.5 md:mr-2" />
                참가 등록
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
});