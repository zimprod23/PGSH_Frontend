import { useState } from 'react';
import { useGetSafePointStatusQuery } from '../api/adminApi';

/**
 * Le verrou que pose la bannière sur un acte irréversible.
 *
 * ⚠ Il ne **bloque** pas définitivement : il exige une case cochée quand il n'y a pas de retour en
 * arrière exploitable. Bloquer sèchement voudrait dire que le jour où Docker ne répond pas, personne
 * ne peut plus clôturer une année — et la règle de la maison est de confirmer ce qui ne se défait
 * pas, pas d'interdire ce que la faculté a décidé.
 */
export function useSafePointGate() {
  const { data } = useGetSafePointStatusQuery(undefined, { refetchOnMountOrArgChange: true });
  const [acknowledged, setAcknowledged] = useState(false);

  // Tant que le statut n'est pas connu, rien n'est exigé : un acte ne se bloque pas sur une requête
  // en vol, et un écran qui refuse sans dire pourquoi est pire qu'un écran qui laisse passer.
  const needsAcknowledgement = data ? !data.hasUsableUndo : false;

  return {
    acknowledged,
    setAcknowledged,
    needsAcknowledgement,
    blocked: needsAcknowledgement && !acknowledged,
  };
}
