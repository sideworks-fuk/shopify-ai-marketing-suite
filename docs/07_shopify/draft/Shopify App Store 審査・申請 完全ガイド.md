# Shopify App Store ���3� �h���

**\�**: 2025t729�  
**\**: ��  
**�a**: Shopify AI Marketing Suite�z���

## 1. �����nhS�

### 1.1 ������
1. **�z�����\**
2. **���\h-�**
3. **�S��n��**
4. **ɭ���Ȗ�**
5. **����**
6. **գ���ï��**
7. **��l�**

### 1.2 ���
- ���: 5-10�m�
- ���: 3-5�m�
- �%�c: 1-2�m�

## 2. ��S��

### 2.1 �<h����ƣ

#### OAuth 2.0��
```ruby
# ����ݤ��
GET  /auth/shopify?shop=example.myshopify.com
GET  /auth/shopify/callback
POST /webhooks/app/uninstalled
```

**��ïݤ��**:
- [ ] HTTPS�����z�	
- [ ] State �������CSRF�V	
- [ ] HMACr<
- [ ] ��������n���X

#### ����ƣ����
```http
Content-Security-Policy: frame-ancestors https://*.myshopify.com https://admin.shopify.com
X-Frame-Options: ALLOW-FROM https://admin.shopify.com
```

### 2.2 �WebhookGDPR��	

#### 1. app/uninstalled
```json
{
  "topic": "app/uninstalled",
  "webhook": {
    "api_version": "2024-01"
  }
}
```
**��**: 48B��kYyfn��������Jd

#### 2. customers/redact
```json
{
  "shop_id": 123456,
  "shop_domain": "example.myshopify.com",
  "customer": {
    "id": 789012,
    "email": "customer@example.com"
  }
}
```
**��**: 30��kg�����Jd

#### 3. shop/redact
```json
{
  "shop_id": 123456,
  "shop_domain": "example.myshopify.com"
}
```
**��**: 90��k��������Jd

#### 4. customers/data_request
```json
{
  "shop_id": 123456,
  "customer": {
    "id": 789012
  }
}
```
**��**: 10��kg�����Л

### 2.3 API(6P

#### ���6P��
```csharp
// ���_�n�ŋ
public async Task<T> ExecuteWithRetry<T>(Func<Task<T>> operation)
{
    var retryPolicy = Policy
        .HandleResult<HttpResponseMessage>(r => r.StatusCode == HttpStatusCode.TooManyRequests)
        .WaitAndRetryAsync(
            3,
            retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
            onRetry: (outcome, timespan, retryCount, context) =>
            {
                _logger.LogWarning($"Retry {retryCount} after {timespan} seconds");
            });
    
    return await retryPolicy.ExecuteAsync(operation);
}
```

## 3. UI/UX��

### 3.1 Polaris��
- [ ] Polaris�������(
- [ ] ���������
- [ ] ��ݰ�գ�Gu�
- [ ] ������ƣ��

### 3.2 �UI� 
```tsx
// ���h:�
<Banner status="critical">
  <p>���n-k���LzW~W_</p>
</Banner>

// ��ǣ�K
<SkeletonPage primaryAction>
  <Layout>
    <Layout.Section>
      <Card sectioned>
        <SkeletonBodyText />
      </Card>
    </Layout.Section>
  </Layout>
</SkeletonPage>
```

### 3.3 ����Ƕ��
- �Ф����
- ����� i
- ǹ����h:

## 4. ɭ���ȁ�

### 4.1 ��з�����	
```markdown
# ��з����

## 1. ��Y��1
- �����1��������	
- g����M����eet	
- F����M�<(�	
- ����臅��M�����	

## 2. �1n(�
- �����n
- �թ��� i
- ���������

## 3. ����w
- ���SSL/TLS	
- ����6�
- ��j����ƣ��

## 4. GDPR��
- ��������ƣ
- Jd)n�<
- :�j֗
```

### 4.2 )(��	
- ��ӹ��
- ��6P
- 儡#)
- ��z

### 4.3 ����
**�,�H**:
```
Shopify AI Marketing SuiteoAI�;(W_ئj����gY

;j_�
"  g�n���h�
" Mt�ns0jF��
" �eѿ��n�
" ���ޤ���j����

�20����n�Fj��K�'�!EC~g��
```

**�H**:
```
Shopify AI Marketing Suite is an advanced analytics tool powered by AI.

Key Features:
" Automatic dormant customer detection and analysis
" Detailed year-over-year product analysis
" Purchase pattern visualization
" Customizable reports

Perfect for specialty stores to large-scale e-commerce.
```

## 5. �������ȁ�

### 5.1 ��������� N5�	
1. **�÷����**: ;�_�n��
2. ** g��**: wS�j�;b
3. **F��**: Mt԰��
4. **����**: ��������j����
5. **-�;b**: ���ޤ��׷��

### 5.2 ����������
- ���: 1280x800px ~_o 2560x1600px
- թ����: PNG ~_o JPEG
- ƹ����(����NG	
- PolarisǶ���

## 6. ����ï��

### 6.1 �S���
- [ ] OAuth 2.0�<��
- [ ] �Webhook4.^	��
- [ ] HTTPS�
- [ ] ��������
- [ ] ���6P��
- [ ] HMAC<

### 6.2 ����ƣ���
- [ ] XSS�V
- [ ] CSRF�V
- [ ] SQL�󸧯����V
- [ ] ���
- [ ] ���j����X

### 6.3 UX���
- [ ] Polaris��
- [ ] ����Ƕ��
- [ ] ij��ǣ�h:
- [ ] ����û��
- [ ] ������ƣ

### 6.4 ɭ�������
- [ ] ��з����
- [ ] )(�
- [ ] ���! �	
- [ ] ����#aH
- [ ] �����K

## 7. �OB���NGѿ��

### 7.1 �S�NG
- L HTTPSjWgn,jK(
- L Webhook��ࢦ�5҅	
- L ij��������
- L ���6P!�

### 7.2 UX�NG
- L Polaris^��nǶ��
- L �Ф�^��
- L �j����û��
- L wB�n��ǣ�

### 7.3 ����NG
- L �j���(�
- L GDPR^��
- L #aH�1n�
- L ���O�

## 8. 3�K

### 8.1 ������÷����gn3�
1. Apps � �a���x�
2. App listing � Edit listing
3. Ł�1�Yyfe�
4. Submit for review

### 8.2 ��Mn B��
```bash
# ��ï����ȋ
echo "=== Shopify App Submission Checklist ==="
echo "[ ] OAuth endpoints working?"
echo "[ ] All webhooks responding < 5 seconds?"
echo "[ ] HTTPS enabled on all endpoints?"
echo "[ ] Privacy policy URL accessible?"
echo "[ ] Terms of service URL accessible?"
echo "[ ] 5+ screenshots uploaded?"
echo "[ ] App description in both languages?"
echo "[ ] Support email configured?"
```

## 9. ���n��

### 9.1 �B
- App Storegnl�-�
- ���ƣ� Pn��
- ����S6n��

### 9.2 tB
- գ���ïns0��
- �c��
- �����83-5�	

### 9.3 a��M�B
- �P�n�c
- ��j_�6Pgnl�

## 10. ���j���餢�

### 10.1 ��j���
- [ ] API�����n��
- [ ] ����ƣ���ni(
- [ ] Polaris��xn��
- [ ] �WD���xn��

### 10.2 �����
```json
{
  "api_version": "2024-01",
  "app_version": "1.0.0",
  "last_review": "2025-08-08",
  "next_review": "2025-11-08"
}
```

---

**́**: Sn���o2025t7B�n��k�eDfD~YShopifyn��o��k��U��_� �nlɭ���Ȃ�Z��WfO`UD