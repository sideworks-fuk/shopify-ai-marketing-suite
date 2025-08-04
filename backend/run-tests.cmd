@echo off
echo ========================================
echo ShopifyAnalyticsApi Unit Tests
echo ========================================

cd ShopifyAnalyticsApi.Tests

echo.
echo Running all tests...
dotnet test --logger "console;verbosity=normal"

echo.
echo ========================================
echo Test execution completed
echo ========================================
pause