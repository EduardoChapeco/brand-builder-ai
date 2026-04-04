// src/lib/payment-orchestrator.ts

type PaymentMethod = "pix" | "credit_card" | "boleto";
type Gateway = "mercadopago" | "asaas" | "abacatepay" | "paypal";

const GATEWAY_PRIORITY: Record<PaymentMethod, Gateway[]> = {
  // PIX: AbacatePay tem menor taxa — usar primeiro
  pix: ["abacatepay", "mercadopago", "asaas"],
  // Cartão BR: Mercado Pago é mais robusto
  credit_card: ["mercadopago", "asaas"],
  // Boleto: Asaas especializado
  boleto: ["asaas"],
};

export async function selectGateway(method: PaymentMethod): Promise<Gateway> {
  const priority = GATEWAY_PRIORITY[method];

  // Verificar quais gateways estão ativos nas configurações do admin
  // (buscar de feature_flags ou de uma tabela de config de gateways)
  // Mocking getActiveGateways for now
  const getActiveGateways = async (): Promise<Gateway[]> => ["mercadopago", "asaas", "abacatepay"];
  
  const activeGateways = await getActiveGateways();

  for (const gateway of priority) {
    if (activeGateways.includes(gateway)) return gateway;
  }

  throw new Error(
    `[ERR_GATEWAY_SESSION_001] Nenhum gateway disponível para ${method}`,
  );
}
