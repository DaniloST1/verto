import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export const MultiSelectResponsible = ({ selectedIds = [], onChange, users = [], label = 'Responsáveis' }) => {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const abr = { admin: 'Admin', finance: 'Financ', supervisor: 'Superv', employee: 'Colab' };

  const availableUsers = useMemo(() => {
    const lower = input.toLowerCase();
    return users.filter(u => {
      if (selectedIds.includes(u.id)) return false; // Hide already selected
      const roleStr = abr[u.role] || u.role;
      return u.name.toLowerCase().includes(lower) || roleStr.toLowerCase().includes(lower);
    });
  }, [input, users, selectedIds]);

  const handleSelect = (id) => {
    const updated = [...selectedIds, id];
    onChange(updated);
    setInput('');
    setIsOpen(false);
  };

  const handleRemove = (idToRemove) => {
    const updated = selectedIds.filter(id => id !== idToRemove);
    onChange(updated);
  };

  return (
    <div className="form-group" style={{ position: 'relative', width: '100%', flex: 1 }} ref={containerRef}>
      <label>{label}</label>
      
      {/* Selected Chips */}
      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          {selectedIds.map(id => {
            const u = users.find(usr => usr.id === id);
            if (!u) return null;
            return (
              <div key={id} style={{
                display: 'flex', alignItems: 'center', gap: '4px', background: '#e2e8f0', 
                color: '#1e293b', padding: '4px 8px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600
              }}>
                {u.name}
                <X size={14} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={(e) => { e.stopPropagation(); handleRemove(id); }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Input */}
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          type="text"
          placeholder="Buscar para adicionar..."
          value={input}
          style={{ paddingLeft: '36px', width: '100%' }}
          onChange={e => {
            setInput(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {/* Dropdown */}
      {isOpen && availableUsers.length > 0 && (
        <div className="autocomplete-dropdown" style={{
          position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', 
          border: '1px solid #e2e8f0', borderRadius: '8px', zIndex: 50, marginTop: '4px', 
          maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {availableUsers.map(u => (
            <div key={u.id} className="autocomplete-item" onClick={() => handleSelect(u.id)} style={{
              padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between'
            }}>
              <strong style={{ color: '#1e293b' }}>{u.name}</strong>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{abr[u.role] || u.role}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
