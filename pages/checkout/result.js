import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function CheckoutResult() {
  const router = useRouter();
  const status = router.query.status;

  useEffect(() => {
    if (!status) return;
    // Siempre terminamos en /compras (el pedido y chat ya los crea el webhook)
    router.replace('/compras');
  }, [status]);

  return null;
}
