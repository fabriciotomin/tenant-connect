import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  condicaoId: string;
  formaId: string;
  onCondicaoChange: (v: string) => void;
  onFormaChange: (v: string) => void;
  paymentConditions: { id: string; descricao: string }[];
  paymentMethods: { id: string; nome: string }[];
}

export function PaymentFieldsSelect({ condicaoId, formaId, onCondicaoChange, onFormaChange, paymentConditions, paymentMethods }: Props) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs">Condição de Pagamento</Label>
        <Select value={condicaoId} onValueChange={onCondicaoChange}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {paymentConditions.map(c => (
              <SelectItem key={c.id} value={c.id} className="text-xs">{c.descricao}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Forma de Pagamento</Label>
        <Select value={formaId} onValueChange={onFormaChange}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {paymentMethods.map(m => (
              <SelectItem key={m.id} value={m.id} className="text-xs">{m.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
