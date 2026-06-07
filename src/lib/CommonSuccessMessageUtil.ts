export const CommonSuccessMessageUtil = {
  created(moduleName: string) {
    return `${moduleName} Created Successfully`;
  },
  updated(moduleName: string) {
    return `${moduleName} Updated Successfully`;
  },
  deleted(moduleName: string) {
    return `${moduleName} Deleted Successfully`;
  },
  exportGenerated() {
    return "Excel Export Generated Successfully";
  }
};
