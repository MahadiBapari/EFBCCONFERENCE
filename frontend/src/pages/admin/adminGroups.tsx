import React, { useState, useEffect } from 'react';
import { Registration, Group, Event } from '../../types';
import { formatDateShort } from '../../utils/dateUtils';
import { getActivityNames } from '../../utils/eventUtils';
import '../../styles/AdminGroups.css';
import { groupsApi } from '../../services/apiClient';

interface AdminGroupsProps {
  registrations: Registration[];
  groups: Group[];
  events: Event[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  handleDeleteGroup: (groupId: number) => void;
  handleCreateGroup: (groupData: Omit<Group, 'id'>) => void;
}

export const AdminGroups: React.FC<AdminGroupsProps> = ({ 
  registrations, 
  groups, 
  events,
  setGroups, 
  handleDeleteGroup, 
  handleCreateGroup 
}) => {
  const [activeTab, setActiveTab] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ groupId: number, index: number } | null>(null);
  const [editingGroup, setEditingGroup] = useState({ id: null as number | null, name: "" });
  const [draggedUnassignedId, setDraggedUnassignedId] = useState<number | null>(null);
  const [unassignedSearchQuery, setUnassignedSearchQuery] = useState("");

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Automatically select the most recent event on component mount and set tabs from event.activities
  useEffect(() => {
    if (events.length > 0 && selectedEventId === null) {
      const mostRecentEvent = events.reduce((latest, current) => {
        return new Date(current.date) > new Date(latest.date) ? current : latest;
      });
      setSelectedEventId(mostRecentEvent.id);
      const activityNames = getActivityNames(mostRecentEvent.activities);
      if (activityNames.length > 0) {
        setActiveTab(activityNames[0]);
      }
    }
  }, [events, selectedEventId]);

  // When selected event changes manually, update activeTab to that event's first activity
  useEffect(() => {
    if (selectedEventId) {
      const ev = events.find(e => e.id === selectedEventId);
      if (ev) {
        const activityNames = getActivityNames(ev.activities);
        if (activityNames.length > 0) {
          setActiveTab(prev => activityNames.includes(prev) ? prev : activityNames[0]);
        }
      }
    }
  }, [selectedEventId, events]);

  const handleAddGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const evId = selectedEventId || (events[0]?.id ?? 1);
    handleCreateGroup({ eventId: evId, category: activeTab, name, members: [] });
    setNewGroupName("");
    setIsCreatingGroup(false);
  };

  const handleStartRename = (group: Group) => {
    setEditingGroup({ id: group.id, name: group.name });
  };

  const handleSaveRename = () => {
    if (!editingGroup.id || !editingGroup.name.trim()) {
      setEditingGroup({ id: null, name: "" });
      return;
    }
    setGroups(g => g.map(group =>
      group.id === editingGroup.id ? { ...group, name: editingGroup.name.trim() } : group
    ));
    setEditingGroup({ id: null, name: "" });
  };

  const persistMembers = async (groupId: number, members: number[]) => {
    try {
      await groupsApi.update(groupId, { members });
    } catch (err) {
      console.error('Failed to persist group members', err);
    }
  };

  const handleAssignMember = (groupId: number, regId: number) => {
    if (!groupId) return;
    const updated = groups.map(group => {
      if (group.id === groupId) {
        if (group.members.includes(regId)) return group;
        return { ...group, members: [...group.members, regId] };
      }
      if (group.category === activeTab) {
        return { ...group, members: group.members.filter(m => m !== regId) };
      }
      return group;
    });
    setGroups(updated);
    const changed = updated.find(g => g.id === groupId);
    if (changed) {
      persistMembers(changed.id, changed.members);
    }
  };
  
  const handleRemoveMember = (groupId: number, memberId: number) => {
    const updated = groups.map(group => {
      if (group.id === groupId) {
        return { ...group, members: group.members.filter(m => m !== memberId) };
      }
      return group;
    });
    setGroups(updated);
    const changed = updated.find(g => g.id === groupId);
    if (changed) {
      persistMembers(changed.id, changed.members);
    }
  };
  
  const handleMoveMember = (memberId: number, sourceGroupId: number, targetGroupId: number) => {
    if (!targetGroupId || sourceGroupId === targetGroupId) return;
    const updated = groups.map(group => {
      if (group.id === sourceGroupId) {
        return { ...group, members: group.members.filter(m => m !== memberId) };
      }
      if (group.id === targetGroupId) {
        return { ...group, members: [...group.members, memberId] };
      }
      return group;
    });
    setGroups(updated);
    const target = updated.find(g => g.id === targetGroupId);
    if (target) {
      persistMembers(target.id, target.members);
    }
  };

  // Drag and Drop Handlers for reordering members
  const handleDragStart = (e: React.DragEvent, groupId: number, index: number) => {
    setDraggedItem({ groupId, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (targetGroupId: number, targetIndex: number) => {
    if (!draggedItem || draggedItem.groupId !== targetGroupId) return;

    const sourceIndex = draggedItem.index;
    if (sourceIndex === targetIndex) return;

    const updated = groups.map(group => {
      if (group.id === targetGroupId) {
        const membersCopy = [...group.members];
        const [removedItem] = membersCopy.splice(sourceIndex, 1);
        membersCopy.splice(targetIndex, 0, removedItem);
        return { ...group, members: membersCopy };
      }
      return group;
    });
    setGroups(updated);
    const changed = updated.find(g => g.id === targetGroupId);
    if (changed) {
      persistMembers(changed.id, changed.members);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Drag and Drop Handlers for assigning unassigned members
  const handleUnassignedDragStart = (e: React.DragEvent, regId: number) => {
    setDraggedUnassignedId(regId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleUnassignedDrop = (e: React.DragEvent, targetGroupId: number) => {
    e.preventDefault();
    if (draggedUnassignedId !== null) {
      handleAssignMember(targetGroupId, draggedUnassignedId);
    }
    setDraggedUnassignedId(null);
    document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
  };
  
  const handleDragOver = (e: React.DragEvent, isTarget: boolean) => {
    e.preventDefault();
    if (isTarget && draggedUnassignedId !== null) {
      e.currentTarget.classList.add('drop-target');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drop-target');
  };

  const handleUnassignedDragEnd = () => {
    setDraggedUnassignedId(null);
  };

  // Filter by selected event first, then by category
  const eventFilteredRegistrations = selectedEventId !== null 
    ? registrations.filter(r => {
        const cancelled = (r as any).status === 'cancelled' || !!(r as any).cancellationAt || !!(r as any).cancellationReason;
        return r.eventId === selectedEventId && !cancelled;
      })
    : registrations.filter(r => {
        const cancelled = (r as any).status === 'cancelled' || !!(r as any).cancellationAt || !!(r as any).cancellationReason;
        return !cancelled;
      });
  
  const eventFilteredGroups = selectedEventId !== null 
    ? groups.filter(g => g.eventId === selectedEventId)
    : groups;
  
  const categoryRegistrations = activeTab ? eventFilteredRegistrations.filter(r => r.category === activeTab) : [];
  const categoryGroups = activeTab ? eventFilteredGroups.filter(g => g.category === activeTab) : [];
  const unassigned = categoryRegistrations.filter(r => !categoryGroups.some(g => g.members.includes(r.id)));
  
  // Filter unassigned based on search query
  const filteredUnassigned = unassigned.filter(reg => {
    if (!unassignedSearchQuery.trim()) return true;
    const query = unassignedSearchQuery.toLowerCase();
    return reg.name.toLowerCase().includes(query);
  });

  return (
    <div className="container">
      <div className="page-header">
        <h1>Group Management</h1>
        <div className="event-selector">
          <label htmlFor="eventSelect" className="filter-label">Select Event:</label>
          <select
            id="eventSelect"
            className="form-control"
            value={selectedEventId || ''}
            onChange={(e) => {
              const eventId = e.target.value ? parseInt(e.target.value) : null;
              setSelectedEventId(eventId);
            }}
          >
            <option value="" disabled>All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.name} - {formatDateShort(event.date)}
                {selectedEventId === event.id ? ' (Current)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="category-tabs">
        {getActivityNames(events.find(e => e.id === selectedEventId)?.activities).map(cat => (
          <button 
            key={cat} 
            className={`tab-btn ${activeTab === cat ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="group-management-layout">
        <div className="card group-column">
          <h4>{activeTab} Groups</h4>
          <div className="group-list">
            {categoryGroups.map(group => (
              <div 
                key={group.id} 
                className="card"
                onDragOver={(e) => handleDragOver(e, true)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleUnassignedDrop(e, group.id)}
              >
                {editingGroup.id === group.id ? (
                  <div className="group-header-editing">
                    <input
                      type="text"
                      className="form-control"
                      value={editingGroup.name}
                      onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })}
                      onBlur={handleSaveRename}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveRename();
                        if (e.key === 'Escape') setEditingGroup({ id: null, name: "" });
                      }}
                      autoFocus
                      aria-label="Edit group name"
                    />
                  </div>
                ) : (
                  <div className="group-header">
                    <h5>
                      <span>{group.name}</span>
                      <span className="member-count">{group.members.length}</span>
                    </h5>
                    <div className="group-actions">
                      <button className="icon-btn" aria-label={`Rename ${group.name}`} onClick={() => handleStartRename(group)}>✏️</button>
                      <button className="icon-btn" aria-label={`Delete ${group.name}`} onClick={() => handleDeleteGroup(group.id)}>🗑️</button>
                    </div>
                  </div>
                )}
                <ul className="group-member-list">
                  {group.members.map((memberId, index) => {
                    const reg = registrations.find(r => r.id === memberId);
                    const isDragging = draggedItem?.groupId === group.id && draggedItem?.index === index;
                    const otherGroups = categoryGroups.filter(g => g.id !== group.id);
                    
                    return (
                      <li 
                        key={memberId}
                        draggable
                        onDragStart={(e) => handleDragStart(e, group.id, index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(group.id, index)}
                        onDragEnd={handleDragEnd}
                        className={isDragging ? 'dragging' : ''}
                      >
                        <span>{reg?.name || 'Unknown'}</span>
                        <div className="member-actions">
                          {otherGroups.length > 0 && (
                            <select
                              className="form-control move-member-select"
                              onChange={(e) => handleMoveMember(memberId, group.id, Number(e.target.value))}
                              value=""
                              aria-label={`Move ${reg?.name} to another group`}
                              onClick={e => e.stopPropagation()}
                            >
                              <option value="" disabled>Move to...</option>
                              {otherGroups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
                          )}
                          <button 
                            className="icon-btn remove-member-btn" 
                            aria-label={`Remove ${reg?.name} from ${group.name}`}
                            onClick={() => handleRemoveMember(group.id, memberId)}
                          >&times;</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {group.members.length === 0 && <p className="empty-group-text">This group is empty.</p>}
              </div>
            ))}
          </div>
          {isCreatingGroup ? (
            <div className="form-group create-group-form">
              <input
                type="text"
                className="form-control"
                placeholder={`New ${activeTab} Group Name`}
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={handleAddGroup}>Save</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsCreatingGroup(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-secondary add-group-btn" onClick={() => setIsCreatingGroup(true)}>+ Add Group</button>
          )}
        </div>

        <div className="card attendees-column">
          <h4>Unassigned Attendees</h4>
          <span className="drag-hint">Drag a member to a group on the left.</span>
          <div className="search-bar" style={{ marginTop: '10px', marginBottom: '10px' }}>
            <input
              type="search"
              placeholder="Search unassigned attendees..."
              className="form-control"
              value={unassignedSearchQuery}
              onChange={(e) => setUnassignedSearchQuery(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          {filteredUnassigned.length > 0 ? (
            <ul className="unassigned-list">
              {filteredUnassigned.map(reg => (
                <li 
                  key={reg.id} 
                  className="unassigned-item"
                  draggable
                  onDragStart={(e) => handleUnassignedDragStart(e, reg.id)}
                  onDragEnd={handleUnassignedDragEnd}
                >
                  {reg.name}
                </li>
              ))}
            </ul>
          ) : (
            <p>{unassignedSearchQuery.trim() ? 'No attendees found matching your search.' : 'No unassigned members in this category.'}</p>
          )}
        </div>
      </div>
    </div>
  );
};
