import { useState } from 'react';
import { Member, Gender, Rank, Player } from '../types/index';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { UserPlus, Edit2, Trash2, Check, X, UserCheck, CheckCircle2, Search, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

interface MemberManagementProps {
  members: Member[];
  players: Player[];
  onAddMember: (name: string, gender?: Gender, rank?: Rank) => void;
  onUpdateMember: (id: string, updates: Partial<Member>) => void;
  onDeleteMember: (id: string) => void;
  onAddMemberAsPlayer: (memberId: string) => void;
}

export function MemberManagement({
  members,
  players,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onAddMemberAsPlayer,
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

  // Check if a member is already registered as a player
  const isMemberRegistered = (memberName: string) => {
    return players.some(player => player.name.startsWith(memberName));
  };

  // Filter members based on search and status
  const filteredMembers = members.filter((member) => {
    // Search filter
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const isRegistered = isMemberRegistered(member.name);
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'registered' && isRegistered) ||
      (filterStatus === 'notRegistered' && !isRegistered);
    
    return matchesSearch && matchesStatus;
  });

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

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Add Member Form */}
      <div className="bg-gradient-to-br from-blue-50/50 to-blue-50/30 border border-blue-200 rounded-xl p-3 md:p-4 shadow-sm">
        <h3 className="font-semibold text-xs md:text-sm text-gray-700 mb-2.5 md:mb-3">모임원 추가</h3>
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="이름 입력"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            className="w-full h-9 md:h-10 text-xs md:text-sm"
          />
          <div className="flex gap-2">
            <Select
              value={newGender}
              onValueChange={(value) => setNewGender(value as Gender)}
            >
              <SelectTrigger className="flex-1 h-9 md:h-10 text-xs md:text-sm">
                <SelectValue placeholder="성별 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="남">남</SelectItem>
                <SelectItem value="녀">녀</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={newRank}
              onValueChange={(value) => setNewRank(value as Rank)}
            >
              <SelectTrigger className="flex-1 h-9 md:h-10 text-xs md:text-sm">
                <SelectValue placeholder="급수 선택" />
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
          <Button onClick={handleAdd} className="w-full h-9 md:h-10 bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-sm text-xs md:text-sm touch-manipulation">
            <UserPlus className="size-3.5 md:size-4 mr-2" />
            모임원 추가
          </Button>
        </div>
      </div>

      {/* Members List */}
      <div>
        <div className="flex items-center justify-between mb-2.5 md:mb-3">
          <h3 className="font-semibold text-xs md:text-sm text-gray-700">등록된 모임원</h3>
          <Badge variant="secondary" className="text-[10px] md:text-xs px-2 py-0.5 shadow-sm">
            {filteredMembers.length}/{members.length}명
          </Badge>
        </div>
        
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
                <div
                  key={member.id}
                  className="bg-white border border-gray-200 rounded-lg p-2.5 md:p-3 hover:shadow-sm transition-all"
                >
                  {editingId === member.id ? (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full h-8 md:h-9 text-xs md:text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Select
                          value={editingGender}
                          onValueChange={(value) => setEditingGender(value as Gender)}
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
                          onValueChange={(value) => setEditingRank(value as Rank)}
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
                          onClick={handleSaveEdit}
                          className="flex-1 h-8 md:h-9 text-[10px] md:text-xs active:scale-95 touch-manipulation"
                        >
                          <Check className="size-3 md:size-3.5 mr-1" />
                          저장
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
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
                          {isMemberRegistered(member.name) && (
                            <Badge className="text-[9px] md:text-xs px-1.5 py-0 bg-emerald-100 border-emerald-300 text-emerald-700">
                              <CheckCircle2 className="size-2.5 md:size-3 mr-0.5" />
                              참가중
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 md:gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(member)}
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
                      </div>
                      {isMemberRegistered(member.name) ? (
                        <div className="w-full px-2.5 md:px-3 py-1.5 md:py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                          <span className="text-[10px] md:text-xs text-emerald-700 font-medium">✓ 참가 등록 완료</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => onAddMemberAsPlayer(member.id)}
                          className="w-full h-8 md:h-9 bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-sm text-[10px] md:text-xs touch-manipulation"
                        >
                          <UserCheck className="size-3 md:size-3.5 mr-1.5 md:mr-2" />
                          참가 등록
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {/* Bottom padding spacer for scroll area */}
              <div className="h-2"></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}