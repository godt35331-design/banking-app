import { TaxRefundsAdmin } from '../../components/admin/TaxRefundsAdmin';
import { PageHeader } from './ui';

export function AdminTaxRefunds() {
  return (
    <div>
      <PageHeader title="Tax refunds" subtitle="Review claims and documents, update their status, then pay the refund." />
      <TaxRefundsAdmin />
    </div>
  );
}
