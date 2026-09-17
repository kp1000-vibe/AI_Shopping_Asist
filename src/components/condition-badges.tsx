import { conditionBadges } from '@/lib/conditions';
import type { RetailerId } from '@/lib/retailers';
import type { ConditionCode } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface ConditionBadgeListProps {
  conditions: readonly ConditionCode[];
  retailer: RetailerId;
  className?: string;
}

export function ConditionBadgeList({ conditions, retailer, className }: ConditionBadgeListProps) {
  if (conditions.length === 0) return null;
  const badges = conditionBadges(conditions, retailer);

  return (
    <ul className={className ?? 'flex flex-wrap gap-1.5'}>
      {badges.map((badge) => (
        <li key={badge.code}>
          <Badge variant={badge.tone} title={badge.description}>
            {badge.label}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
