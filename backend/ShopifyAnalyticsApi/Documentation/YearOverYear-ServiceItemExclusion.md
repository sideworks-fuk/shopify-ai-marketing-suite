# Year-Over-Year Analysis - Service Item Exclusion Feature

## Overview
This feature allows users to exclude service-related items (shipping fees, handling charges, etc.) from year-over-year analysis to get a clearer picture of actual product sales performance.

## Implementation Details

### API Parameter
Added `ExcludeServiceItems` boolean parameter to the year-over-year analysis API endpoint.

**Endpoint**: `GET /api/analytics/year-over-year`

**New Parameter**:
- `excludeServiceItems` (boolean, optional, default: false) - When set to true, excludes service items from the analysis

### Service Item Keywords
The following keywords are used to identify service items:
- 代引き手数料 (Cash on delivery fee)
- 送料 (Shipping fee)
- 手数料 (Service charge)
- サービス料 (Service fee)
- 配送料 (Delivery fee)
- 決済手数料 (Payment processing fee)
- 包装料 (Packaging fee)

### Usage Examples

1. **Basic request without service item exclusion**:
   ```
   GET /api/analytics/year-over-year?storeId=1&year=2024&viewMode=sales
   ```

2. **Request with service item exclusion**:
   ```
   GET /api/analytics/year-over-year?storeId=1&year=2024&viewMode=sales&excludeServiceItems=true
   ```

3. **Combined with other filters**:
   ```
   GET /api/analytics/year-over-year?storeId=1&year=2024&viewMode=sales&excludeServiceItems=true&startMonth=1&endMonth=6&sortBy=growth_rate
   ```

### Implementation Files Modified

1. **Models** (`YearOverYearModels.cs`):
   - Added `ExcludeServiceItems` property to `YearOverYearRequest` class

2. **Services**:
   - `YearOverYearService.cs`: Added service item filtering logic in `GetOrderItemsDataAsync` method
   - `YearOverYearDataService.cs`: Added same filtering logic for the new service architecture
   - `YearOverYearOrchestrationService.cs`: Updated cache key generation to include the new parameter

3. **Constants**:
   - Added `ServiceItemKeywords` array containing the Japanese keywords for service items

### Filtering Logic
When `ExcludeServiceItems` is true, the system filters out any order items where the product title contains any of the service item keywords. This is done at the database query level for optimal performance:

```csharp
if (request.ExcludeServiceItems)
{
    query = query.Where(x => !ServiceItemKeywords.Any(keyword => x.ProductTitle.Contains(keyword)));
}
```

### Cache Considerations
The cache key includes the `ExcludeServiceItems` parameter to ensure that results with and without service item exclusion are cached separately.

### Testing
- Created unit tests in `ServiceItemExclusionTests.cs` to verify the filtering functionality
- Created HTTP test file `ShopifyTestApi-YearOverYear.http` with various test scenarios

### Performance Impact
The filtering is performed at the database level using LINQ, which translates to SQL WHERE clauses. This ensures minimal performance impact while providing accurate filtering.

## Benefits
1. **Accurate Product Analysis**: Users can analyze actual product performance without service fees skewing the data
2. **Better Growth Metrics**: Growth rates reflect actual product sales trends
3. **Cleaner Comparisons**: Year-over-year comparisons are more meaningful when comparing like-for-like items

## Future Enhancements
1. Make the service item keywords configurable via settings
2. Add language support for service item keywords in other languages
3. Allow users to specify custom keywords for exclusion
4. Add a summary showing how much was excluded from the analysis