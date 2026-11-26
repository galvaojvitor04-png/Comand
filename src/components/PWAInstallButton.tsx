import { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { Modal } from './Modal.tsx';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-800 bg-white border border-stone-200 hover:bg-stone-50 rounded-md transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5 text-emerald-800" />
        Instalar App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-800 bg-white border border-stone-200 hover:bg-stone-50 rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-800" />
          Instalar no iOS
        </button>

        <Modal
          open={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          title="Instalar no iPhone / iPad"
          maxWidthClass="max-w-sm"
        >
          <div className="p-5 space-y-4">
            <p className="text-sm text-stone-600 leading-relaxed">
              1. Toque em <strong>Compartilhar</strong> na barra do Safari.
              <br />
              2. Escolha <strong>Adicionar à Tela de Início</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-md"
            >
              Fechar
            </button>
          </div>
        </Modal>
      </>
    );
  }

  return null;
}
