/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, testConnection } from './firebase';
import { 
  subscribeToAssets, 
  subscribeToAuditLogs, 
  subscribeToMaintenance,
  createAsset,
  updateAsset,
  deleteAsset,
  seedSampleAssetsIfEmpty
} from './services/assetService';
import { Asset, AssetAuditLog, MaintenanceRecord, AssetStatus } from './types/asset';
import { Header, ActiveNavTab } from './components/Header';
import { KPIStats } from './components/KPIStats';
import { AssetTable } from './components/AssetTable';
import { OfficeAssetMap } from './components/OfficeAssetMap';
import { AssetLiveMonitoring } from './components/AssetLiveMonitoring';
import { MaintenanceAndAudit } from './components/MaintenanceAndAudit';
import { AssetModal } from './components/AssetModal';
import { MaintenanceModal } from './components/MaintenanceModal';
import { AssetDetailDrawer } from './components/AssetDetailDrawer';
import { ReplaceDeviceModal } from './components/ReplaceDeviceModal';
import { 
  Building2, 
  ShieldCheck, 
  Activity, 
  Plus, 
  ArrowRight, 
  Database, 
  MapPin, 
  Radio, 
  Video 
} from 'lucide-react';
import facilityHubImg from './assets/images/facility_asset_hub_1793068375794.jpg';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('overview');

  const [assets, setAssets] = useState<Asset[]>([]);
  const [auditLogs, setAuditLogs] = useState<AssetAuditLog[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals & Drawers
  const [isAssetModalOpen, setIsAssetModalOpen] = useState<boolean>(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<Asset | null>(null);
  const [highlightedMapAssetId, setHighlightedMapAssetId] = useState<string | undefined>();
  
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState<boolean>(false);
  const [replaceTargetAsset, setReplaceTargetAsset] = useState<Asset | null>(null);

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState<boolean>(false);
  const [maintenanceTargetAsset, setMaintenanceTargetAsset] = useState<Asset | null>(null);

  const [deleteConfirmAsset, setDeleteConfirmAsset] = useState<Asset | null>(null);

  // Firestore connection validation on boot
  useEffect(() => {
    async function verify() {
      const ok = await testConnection();
      setIsConnected(ok);
    }
    verify();
  }, []);

  // Auth observer
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Real-time Firestore subscriptions
  useEffect(() => {
    setIsLoading(true);

    const unsubAssets = subscribeToAssets(
      (data) => {
        setAssets(data);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Real-time assets error:', err);
        setIsLoading(false);
      }
    );

    const unsubLogs = subscribeToAuditLogs(
      (data) => {
        setAuditLogs(data);
      },
      (err) => {
        console.warn('Audit logs error:', err);
      }
    );

    const unsubMaintenance = subscribeToMaintenance(
      (data) => {
        setMaintenanceRecords(data);
      },
      (err) => {
        console.warn('Maintenance error:', err);
      }
    );

    return () => {
      if (unsubAssets) unsubAssets();
      if (unsubLogs) unsubLogs();
      if (unsubMaintenance) unsubMaintenance();
    };
  }, []);

  // Quick Seed Sample Data Handler
  const handleSeedData = async () => {
    setIsLoading(true);
    await seedSampleAssetsIfEmpty();
    setIsLoading(false);
  };

  // Add / Edit asset save handler
  const handleSaveAsset = async (assetData: Omit<Asset, 'id'>) => {
    if (editingAsset) {
      await updateAsset(
        editingAsset.id,
        assetData,
        `Pembaruan inventaris ${assetData.assetTag} (${assetData.name})`
      );
    } else {
      await createAsset(assetData);
    }
    setEditingAsset(null);
  };

  // Quick Status change inline from table
  const handleQuickStatusChange = async (
    assetId: string, 
    newStatus: AssetStatus, 
    assetTag: string, 
    assetName: string
  ) => {
    await updateAsset(
      assetId,
      { status: newStatus },
      `Status inventaris ${assetTag} diubah menjadi "${newStatus}"`
    );
  };

  // Delete asset
  const handleConfirmDelete = async () => {
    if (!deleteConfirmAsset) return;
    try {
      await deleteAsset(deleteConfirmAsset.id, deleteConfirmAsset.assetTag, deleteConfirmAsset.name);
      setDeleteConfirmAsset(null);
    } catch (err) {
      console.error('Delete asset error:', err);
    }
  };

  // View specific asset on map
  // View specific asset on map
  const handleViewOnMap = (asset: Asset) => {
    setHighlightedMapAssetId(asset.id);
    setActiveTab('map');
  };

  // Open Replace Device modal (Catat KIT/SN Sebelum & Sesudah)
  const handleOpenReplaceModal = (asset: Asset) => {
    setReplaceTargetAsset(asset);
    setIsReplaceModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => {
          setEditingAsset(null);
          setIsAssetModalOpen(true);
        }}
        currentUser={currentUser}
        isConnected={isConnected}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Strip */}
        <KPIStats assets={assets} />

        {/* TAB 1: OVERVIEW & RINGKASAN */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Visual Facility Showcase Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Context: Facility & Real-time Integration */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 w-fit px-2.5 py-1 rounded-md border border-emerald-200 mb-3">
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Inventaris 8 Site Operasi Tambang & Sucofindo Berau</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Sistem Inventaris Site & Monitoring Starlink - CCTV
                  </h1>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    Pelacakan perangkat telekomunikasi Starlink (CID, KIT, Paket Langganan) dan sistem kamera CCTV (SN, Tipe, IP, User & Password) di 8 Site Operasi Tambang (BMO 1, BMO 2, BMO 3, LMO, SMO, PMO, GMO) dan Kantor Sucofindo Berau, lengkap dengan koordinat GPS aktual di lapangan dan riwayat pergantian unit.
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveTab('map')}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>Buka Peta Lokasi</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('inventory')}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <span>Daftar Inventaris</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>

                  <button
                    onClick={() => setActiveTab('monitoring')}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Monitoring Live</span>
                  </button>

                  {assets.length === 0 && !isLoading && (
                    <button
                      onClick={handleSeedData}
                      className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors ml-auto"
                    >
                      Muat Data Starlink & CCTV
                    </button>
                  )}
                </div>
              </div>

              {/* Right Media: Facility Showcase */}
              <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-slate-200 relative min-h-[240px] shadow-xs group">
                <img
                  src={facilityHubImg}
                  alt="Modern Logistics and Office Facility"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent flex flex-col justify-end p-5 text-white">
                  <div className="text-[11px] font-mono tracking-wider text-emerald-400 uppercase">
                    Pusat Operasional & Jaringan Kantor
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    Terminal Satelit & CCTV Surveillance Hub
                  </div>
                  <div className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                    <span>{assets.length} perangkat terdata</span>
                    <span aria-hidden="true">·</span>
                    <span>Monitoring koordinat GPS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Map Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Peta Persebaran Lokasi Perangkat
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sebaran pin Starlink dan CCTV di seluruh kantor pusat, cabang, dan remote site.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('map')}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1"
                >
                  <span>Buka Peta Penuh</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <OfficeAssetMap
                assets={assets}
                onSelectAsset={(a) => setSelectedAssetDetail(a)}
                selectedAssetId={highlightedMapAssetId}
              />
            </div>

            {/* Quick Preview Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Daftar Inventaris Terpasang
                  </h2>
                  <p className="text-xs text-slate-500">
                    Daftar perangkat Starlink dan CCTV terkini beserta lokasi penempatan.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('inventory')}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1"
                >
                  <span>Lihat Semua ({assets.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <AssetTable
                assets={assets.slice(0, 5)}
                onSelectAsset={(a) => setSelectedAssetDetail(a)}
                onEditAsset={(a) => {
                  setEditingAsset(a);
                  setIsAssetModalOpen(true);
                }}
                onDeleteAsset={(a) => setDeleteConfirmAsset(a)}
                onQuickStatusChange={handleQuickStatusChange}
                onSeedData={handleSeedData}
                onViewOnMap={handleViewOnMap}
                onOpenReplaceModal={handleOpenReplaceModal}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}

        {/* TAB 2: PETA & KOORDINAT */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  Peta Lokasi & Pemetaan Koordinat GPS Site
                </h1>
                <p className="text-xs text-slate-500">
                  Klik titik marker untuk melihat informasi perangkat atau pilih site operasi tambang Berau pada dropdown.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingAsset(null);
                  setIsAssetModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>+ Pasang Perangkat Baru</span>
              </button>
            </div>

            <OfficeAssetMap
              assets={assets}
              onSelectAsset={(a) => setSelectedAssetDetail(a)}
              selectedAssetId={highlightedMapAssetId}
            />
          </div>
        )}

        {/* TAB 3: INVENTORY */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  Daftar Inventaris Site & Kantor (Starlink & CCTV)
                </h1>
                <p className="text-xs text-slate-500">
                  Pencarian instan berdasarkan Nama Titik, CID, KIT, Serial Number (SN), IP Address, dan lokasi site tambang.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingAsset(null);
                  setIsAssetModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Tambah Perangkat Baru</span>
              </button>
            </div>

            <AssetTable
              assets={assets}
              onSelectAsset={(a) => setSelectedAssetDetail(a)}
              onEditAsset={(a) => {
                setEditingAsset(a);
                setIsAssetModalOpen(true);
              }}
              onDeleteAsset={(a) => setDeleteConfirmAsset(a)}
              onQuickStatusChange={handleQuickStatusChange}
              onSeedData={handleSeedData}
              onViewOnMap={handleViewOnMap}
              onOpenReplaceModal={handleOpenReplaceModal}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* TAB 4: REAL-TIME MONITORING */}
        {activeTab === 'monitoring' && (
          <AssetLiveMonitoring
            assets={assets}
            onSelectAsset={(a) => setSelectedAssetDetail(a)}
            onOpenMaintenanceModal={(a) => {
              setMaintenanceTargetAsset(a);
              setIsMaintenanceModalOpen(true);
            }}
          />
        )}

        {/* TAB 5: MAINTENANCE & AUDIT TRAIL */}
        {activeTab === 'maintenance' && (
          <MaintenanceAndAudit
            maintenanceRecords={maintenanceRecords}
            auditLogs={auditLogs}
            assets={assets}
            onOpenNewMaintenanceModal={() => {
              setMaintenanceTargetAsset(null);
              setIsMaintenanceModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Modals & Overlays */}
      <AssetModal
        isOpen={isAssetModalOpen}
        onClose={() => {
          setIsAssetModalOpen(false);
          setEditingAsset(null);
        }}
        onSave={handleSaveAsset}
        initialData={editingAsset}
      />

      <ReplaceDeviceModal
        isOpen={isReplaceModalOpen}
        onClose={() => {
          setIsReplaceModalOpen(false);
          setReplaceTargetAsset(null);
        }}
        asset={replaceTargetAsset}
      />

      <MaintenanceModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => {
          setIsMaintenanceModalOpen(false);
          setMaintenanceTargetAsset(null);
        }}
        selectedAsset={maintenanceTargetAsset}
        allAssets={assets}
      />

      <AssetDetailDrawer
        asset={selectedAssetDetail}
        onClose={() => setSelectedAssetDetail(null)}
        onEdit={(a) => {
          setEditingAsset(a);
          setIsAssetModalOpen(true);
        }}
        onDelete={(a) => setDeleteConfirmAsset(a)}
        onScheduleMaintenance={(a) => {
          setMaintenanceTargetAsset(a);
          setIsMaintenanceModalOpen(true);
        }}
        onViewOnMap={handleViewOnMap}
        onOpenReplaceModal={handleOpenReplaceModal}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-5 border border-slate-200 max-w-sm w-full space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Konfirmasi Hapus Perangkat
            </h3>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus perangkat <strong className="text-slate-900">{deleteConfirmAsset.assetTag} - {deleteConfirmAsset.name}</strong> dari inventaris kantor?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmAsset(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>Sistem Inventaris Kantor & Pemantauan IoT</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Database Terintegrasi Firestore</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>Leaflet Map & Koordinat GPS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
