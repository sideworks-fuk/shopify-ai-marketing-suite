using BlobFunction.Models;

namespace BlobFunction.Services;

public interface IDataImportService
{
    /// <summary>
    /// Imports customer data to the database
    /// </summary>
    Task<ImportResult> ImportCustomers(List<CustomerCsvRecord> customers, string storeId);

    /// <summary>
    /// Imports order data to the database
    /// </summary>
    Task<ImportResult> ImportOrders(List<OrderCsvRecord> orders, string storeId);

    /// <summary>
    /// Imports product data to the database
    /// </summary>
    Task<ImportResult> ImportProducts(List<ProductCsvRecord> products, string storeId);
}