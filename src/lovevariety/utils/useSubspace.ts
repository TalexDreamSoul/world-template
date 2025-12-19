import { useMemo } from "react";
import type { AsyncTupleDatabaseClientApi, KeyValuePair } from "tuple-database";
import type { TuplePrefix } from "tuple-database/database/typeHelpers";

export function useSubspace<
  S extends KeyValuePair,
  P extends TuplePrefix<S["key"]>,
>(db: AsyncTupleDatabaseClientApi<S>, ...prefix: P) {
  return useMemo(() => db.subspace(prefix), [db, ...prefix]);
}
