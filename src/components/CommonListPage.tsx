import type { ReactNode } from "react";
import { CommonBreadcrumb, type BreadcrumbItem } from "./CommonBreadcrumb";
import { CommonColumnSelector } from "./CommonColumnSelector";
import { GlassCard } from "./GlassCard";
import { Header } from "./Header";
import { ListToolbar } from "./ListToolbar";
import { Pagination } from "./Pagination";
import { Table, type Column, type TableRowSelection } from "./Table";
import { useBreadcrumbs } from "../hooks/useBreadcrumbs";
import type { FiltersWithSearch, ListPageController } from "../hooks/useListPage";

export type ColumnSelectorConfig<TRow> = {
  tableName: string;
  columns: Column<TRow>[];
  visible: string[];
  onChange: (keys: string[]) => void;
  lockedKeys?: string[];
};

/**
 * Har list page ka common dhancha:
 * Header > (statCards) > GlassCard > Breadcrumb > ListToolbar > Table > modals
 * Page sirf apna data/columns/fields deta hai — layout yahin se aata hai.
 */
export function CommonListPage<TRow, TFilters extends FiltersWithSearch>({
  pageTitle,
  pageSubtitle,
  breadcrumbs,
  statCards,
  list,
  liveSearch = false,
  searchPlaceholder = "Search",
  activeFilterCount,
  filterPanelWidth,
  filtersClassName,
  filterFields,
  toolbarButtons,
  columnSelector,
  tableColumns,
  emptyMessage = "No records found.",
  emptyAction,
  rowSelection,
  fullHeight = false,
  aboveTable,
  modals
}: {
  pageTitle: string;
  pageSubtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  statCards?: ReactNode;
  list: ListPageController<TRow, TFilters>;
  liveSearch?: boolean;
  searchPlaceholder?: string;
  activeFilterCount?: (filters: TFilters) => number;
  filterPanelWidth?: string;
  filtersClassName?: string;
  filterFields?: ReactNode;
  toolbarButtons?: ReactNode;
  columnSelector?: ColumnSelectorConfig<TRow>;
  tableColumns: Column<TRow>[];
  emptyMessage?: string;
  emptyAction?: ReactNode;
  rowSelection?: TableRowSelection<TRow>;
  fullHeight?: boolean;
  aboveTable?: ReactNode;
  modals?: ReactNode;
}) {
  const derivedBreadcrumbs = useBreadcrumbs();
  const breadcrumbItems = breadcrumbs ?? derivedBreadcrumbs;
  const toolbarActions =
    toolbarButtons || columnSelector ? (
      <>
        {toolbarButtons}
        {columnSelector ? (
          <CommonColumnSelector
            tableName={columnSelector.tableName}
            availableColumns={columnSelector.columns.map((column) => ({
              key: column.key,
              header: column.header,
              locked: columnSelector.lockedKeys?.includes(column.key)
            }))}
            visibleColumns={columnSelector.visible}
            onApply={columnSelector.onChange}
          />
        ) : null}
      </>
    ) : undefined;
  return (
    <div className={fullHeight ? "flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6" : "space-y-4 pb-6"}>
      <Header title={pageTitle} subtitle={pageSubtitle ?? ""} />
      {statCards}
      <GlassCard className={`p-6 md:p-7 ${fullHeight ? "flex flex-1 flex-col" : ""}`}>
        <div className={`mb-5 ${breadcrumbItems.length ? "space-y-4" : ""}`}>
          {breadcrumbItems.length ? <CommonBreadcrumb items={breadcrumbItems} /> : null}
          <ListToolbar
            searchValue={String(list.formFilters.search ?? "")}
            searchPlaceholder={searchPlaceholder}
            onSearchChange={(value) => {
              if (liveSearch) {
                list.applySearchNow(value);
              } else {
                list.updateSearchDraft(value);
              }
            }}
            onSearchSubmit={liveSearch ? undefined : list.applyFilters}
            onSearchClear={liveSearch ? undefined : list.clearSearchBox}
            filtersActiveCount={activeFilterCount ? activeFilterCount(list.activeFilters) : 0}
            filterPanelWidth={filterPanelWidth}
            filtersClassName={filtersClassName}
            onApplyFilters={list.applyFilters}
            onCancelFilters={list.discardFormFilters}
            onResetFilters={list.resetAllFilters}
            actions={toolbarActions}
            pagination={
              <Pagination
                page={list.paginationInfo.page}
                size={list.paginationInfo.size}
                totalRecords={list.paginationInfo.totalRecords}
                totalPages={list.paginationInfo.totalPages}
                disabled={list.loading}
                onPageChange={list.goToPage}
                layout="inline"
              />
            }
          >
            {filterFields}
          </ListToolbar>
        </div>
        <div className={fullHeight ? "flex-1" : undefined}>
          {aboveTable}
          <Table
            data={list.tableData}
            columns={tableColumns}
            emptyText={emptyMessage}
            emptyAction={emptyAction}
            rowSelection={rowSelection}
          />
        </div>
      </GlassCard>
      {modals}
    </div>
  );
}
