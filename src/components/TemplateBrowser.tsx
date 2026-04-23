'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ExternalLink,
  RefreshCw,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────
export interface CgSaveData {
  templateName: string;
  templateId: string;
  concept: string;
  variant: string;
  dataElementName: string;
  dataElementId: string;
  fieldData: Record<string, string>;
  mosObjId: string;
  mosObjXml: string;
}

interface PdsDataElement {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  updated: string;
}

interface CgListItem {
  cgItemId: string;
  templateName: string;
  dataElementName: string;
  fieldData: Record<string, string>;
  status: string;
  orderIndex: number;
  mosObjId: string;
}

interface TemplateBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cgData: CgSaveData) => void;
  onDelete: (cgItemId: string) => void;
  onReorder: (cgItemIds: string[]) => void;
  existingCgs: CgListItem[];
  storyId: string;
  entryId?: string;
  storySlug?: string;
}

const POLL_INTERVAL = 3000;

// ─── Component ───────────────────────────────────────────
export default function TemplateBrowser({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onReorder,
  existingCgs,
  storyId,
  entryId,
  storySlug,
}: TemplateBrowserProps) {
  const [mode, setMode] = useState<'list' | 'adding'>('list');
  const [launchTime, setLaunchTime] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [newElements, setNewElements] = useState<PdsDataElement[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [launchStatus, setLaunchStatus] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alreadySavedIdsRef = useRef<Set<string>>(new Set());

  // ─── Reset on open ────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setMode('list');
      setLaunchTime(null);
      setPolling(false);
      setNewElements([]);
      setSaving(false);
      setSavedCount(0);
      setError(null);
      setLaunchStatus(null);
      setConfirmDelete(null);
      alreadySavedIdsRef.current = new Set();
    }
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ─── Polling ───────────────────────────────────────────
  const startPolling = useCallback((since: string) => {
    setPolling(true);
    setNewElements([]);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/viz/dataelements?since=${encodeURIComponent(since)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.elements && data.elements.length > 0) {
          const fresh = data.elements.filter(
            (el: PdsDataElement) => !alreadySavedIdsRef.current.has(el.id)
          );
          if (fresh.length > 0) setNewElements(fresh);
        }
      } catch {
        // Silent
      }
    }, POLL_INTERVAL);
  }, []);

  const stopPolling = useCallback(() => {
    setPolling(false);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // ─── Launch Viz Pilot on the LOCAL client machine via custom protocol ─────
  // Requires vizpilot:// to be registered in Windows registry on each workstation.
  // Users run public/vizpilot-protocol.reg once to set it up.
  const handleLaunchVizPilot = () => {
    const now = new Date().toISOString();
    setLaunchTime(now);
    setMode('adding');
    setError(null);
    setLaunchStatus('Opening Viz Pilot on this station...');
    setNewElements([]);

    // Build context params for the bat file
    const params = new URLSearchParams({
      ncsid: 'NEWSFORGE',
      storyid: storyId || '',
      storyslug: storySlug || storyId || '',
    });
    if (entryId) params.set('entryid', entryId);

    // Trigger the vizpilot:// custom protocol — runs open-viz-pilot.bat on THIS machine
    const protocolUrl = `vizpilot://launch?${params.toString()}`;
    window.location.href = protocolUrl;

    // Give the OS a moment to respond, then update status
    setTimeout(() => {
      setLaunchStatus(null);
      // Start polling PDS for newly saved elements after a short delay
      startPolling(now);
    }, 1500);
  };


  // ─── Manual refresh ────────────────────────────────────
  const handleRefresh = async () => {
    if (!launchTime) return;
    setError(null);

    try {
      const res = await fetch(
        `/api/viz/dataelements?since=${encodeURIComponent(launchTime)}`
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const fresh = (data.elements || []).filter(
        (el: PdsDataElement) => !alreadySavedIdsRef.current.has(el.id)
      );
      setNewElements(fresh);
      if (fresh.length === 0) {
        setError('No new CG elements found. Save in Viz Pilot first.');
      }
    } catch {
      setError('Could not reach Viz PDS.');
    }
  };

  // ─── Save detected element ────────────────────────────
  const handleAddElement = async (element: PdsDataElement) => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/viz/dataelements/${element.id}`);
      if (!res.ok) throw new Error('Failed to fetch details');
      const detail = await res.json();

      // ─────────────────────────────────────────────────────────────
      // TEMPLATE NAME PRIORITY (first non-empty string wins):
      //   1. detail.templateName  — PDS detail endpoint (most specific)
      //   2. element.templateName — from PDS list endpoint
      //   3. element.name         — data element title (always populated)
      //   4. detail.elementName   — guaranteed fallback from detail route
      //   5. concept / variant    — structural fallback
      //   6. 'CG Graphic'         — absolute last resort
      // ─────────────────────────────────────────────────────────────
      const templateName =
        (detail.templateName?.trim()) ||
        (element.templateName?.trim()) ||
        (element.name?.trim()) ||
        (detail.elementName?.trim()) ||
        (detail.concept
          ? detail.variant
            ? `${detail.concept} / ${detail.variant}`
            : detail.concept
          : '') ||
        'CG Graphic';

      // dataElementName: always use the operator-saved element title
      const dataElementName =
        (element.name?.trim()) ||
        (detail.elementName?.trim()) ||
        (detail.name?.trim()) ||
        `Element ${element.id}`;

      console.log('[CG] Adding element:', {
        elementId: element.id,
        resolvedTemplateName: templateName,
        resolvedElementName: dataElementName,
        sources: {
          'detail.templateName': detail.templateName || '(empty)',
          'element.templateName': element.templateName || '(empty)',
          'element.name': element.name || '(empty)',
          'detail.elementName': detail.elementName || '(empty)',
          'detail.concept': detail.concept || '(empty)',
        },
      });

      const cgData: CgSaveData = {
        templateName,
        templateId: detail.templateId || element.templateId || element.id || '',
        concept: detail.concept || '',
        variant: detail.variant || '',
        dataElementName,
        dataElementId: element.id,
        fieldData: detail.fields || {},
        mosObjId: detail.mosObjId || element.id || '',
        mosObjXml: detail.mosObjXml || '',
      };

      alreadySavedIdsRef.current.add(element.id);
      setNewElements((prev) => prev.filter((el) => el.id !== element.id));
      onSave(cgData);
      setSavedCount((c) => c + 1);
    } catch (err: unknown) {
      setError(`Failed to fetch CG details: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };


  // ─── Reorder ───────────────────────────────────────────
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const ids = existingCgs.map((cg) => cg.cgItemId);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    onReorder(ids);
  };

  const handleMoveDown = (index: number) => {
    if (index >= existingCgs.length - 1) return;
    const ids = existingCgs.map((cg) => cg.cgItemId);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    onReorder(ids);
  };

  // ─── Delete ────────────────────────────────────────────
  const handleDelete = (cgItemId: string) => {
    if (confirmDelete === cgItemId) {
      onDelete(cgItemId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(cgItemId);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  if (!isOpen) return null;

  const sortedCgs = [...existingCgs].sort(
    (a, b) => a.orderIndex - b.orderIndex
  );

  return (
    <div className="fixed top-0 left-0 z-50 h-full flex flex-col" style={{ width: '420px' }}>
      <div className="bg-white h-full flex flex-col overflow-hidden border-r border-gray-300" style={{ boxShadow: '4px 0 15px rgba(0,0,0,0.15)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">CG Graphics</h2>
            <span className="text-sm text-gray-500">
              {storySlug || storyId}
            </span>
            {sortedCgs.length > 0 && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {sortedCgs.length} CG{sortedCgs.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={() => { stopPolling(); onClose(); }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            <strong>First time using Viz Pilot from this browser?</strong><br />
            You need to install the protocol handler on this workstation. 
            <a href="/vizpilot-protocol.reg" download className="ml-1 text-blue-600 underline font-medium cursor-pointer">
              Download and run vizpilot-protocol.reg
            </a>, then click Yes to the registry warnings.
          </div>
          
          {/* Existing CG List */}
          {sortedCgs.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Attached CG Graphics
              </h3>
              <div className="space-y-2">
                {sortedCgs.map((cg, index) => (
                  <div
                    key={cg.cgItemId}
                    className="border rounded-lg p-3 bg-white hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col items-center pt-1 text-gray-300">
                        <GripVertical size={14} />
                        <span className="text-xs font-mono mt-1">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {cg.templateName}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              cg.status === 'READY'
                                ? 'bg-green-100 text-green-700'
                                : cg.status === 'ON_AIR'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {cg.status}
                          </span>
                        </div>
                        {cg.dataElementName && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {cg.dataElementName}
                          </p>
                        )}
                        {Object.keys(cg.fieldData || {}).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(cg.fieldData)
                              .slice(0, 4)
                              .map(([key, val]) => (
                                <span
                                  key={key}
                                  className="text-xs bg-gray-50 px-1.5 py-0.5 rounded border"
                                  title={`${key}: ${val}`}
                                >
                                  <span className="text-gray-400">{key}:</span>{' '}
                                  {String(val).substring(0, 20)}
                                </span>
                              ))}
                            {Object.keys(cg.fieldData).length > 4 && (
                              <span className="text-xs text-gray-400">
                                +{Object.keys(cg.fieldData).length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                          title="Move up"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index >= sortedCgs.length - 1}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                          title="Move down"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(cg.cgItemId)}
                          className={`p-1 rounded ${
                            confirmDelete === cg.cgItemId
                              ? 'bg-red-100 text-red-600'
                              : 'hover:bg-gray-100 text-gray-400 hover:text-red-500'
                          }`}
                          title={confirmDelete === cg.cgItemId ? 'Click again to confirm' : 'Delete'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add CG Section */}
          {mode === 'list' ? (
            <button
              onClick={handleLaunchVizPilot}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200">
                  <Plus size={24} className="text-blue-600" />
                </div>
                <span className="font-medium text-gray-700 group-hover:text-blue-700">
                  {sortedCgs.length === 0 ? 'Add CG Graphic' : 'Add Another CG'}
                </span>
                <span className="text-xs text-gray-400">
                  Opens Viz Pilot on this workstation via protocol
                </span>
              </div>
            </button>
          ) : (
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50/50">
              {/* Launch status */}
              {launchStatus ? (
                <div className="flex items-center gap-2 mb-3 text-sm text-blue-700">
                  <RefreshCw size={14} className="animate-spin" />
                  {launchStatus}
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-3">
                  <Check size={16} className="text-green-600" />
                  <span className="text-sm text-green-800 font-medium">
                    Viz Pilot launched on this station
                  </span>
                  {savedCount > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full ml-auto">
                      {savedCount} saved this session
                    </span>
                  )}
                </div>
              )}

              {/* Detected elements */}
              {newElements.length > 0 ? (
                <div className="space-y-2 mb-3">
                  <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    New Graphics Detected
                  </h4>
                  {newElements.map((el) => (
                    <div
                      key={el.id}
                      className="flex items-center justify-between p-3 bg-white border border-green-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{el.name}</p>
                        <p className="text-xs text-gray-500">
                          Template: {el.templateName} • ID: {el.id}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddElement(el)}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {saving ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Plus size={14} />
                        )}
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  {polling ? (
                    <>
                      <RefreshCw size={20} className="animate-spin text-blue-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        Waiting for save in Viz Pilot...
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Auto-checking every {POLL_INTERVAL / 1000}s
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Save a graphic in Viz Pilot, then click Refresh
                    </p>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 mb-3">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-3 border-t border-blue-200">
                <div className="flex gap-2">
                  <button
                    onClick={handleLaunchVizPilot}
                    className="px-3 py-1.5 text-sm border rounded hover:bg-white inline-flex items-center gap-1"
                  >
                    <ExternalLink size={14} />
                    Reopen Viz Pilot
                  </button>
                  <button
                    onClick={handleRefresh}
                    className="px-3 py-1.5 text-sm border rounded hover:bg-white inline-flex items-center gap-1"
                  >
                    <RefreshCw size={14} />
                    Refresh
                  </button>
                </div>
                <button
                  onClick={() => { stopPolling(); setMode('list'); }}
                  className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Done Adding
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          <span className="text-xs text-gray-400">
            {sortedCgs.length} CG{sortedCgs.length !== 1 ? 's' : ''} attached
            {entryId && ` • Entry: ${entryId}`}
          </span>
          <button
            onClick={() => { stopPolling(); onClose(); }}
            className="px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
