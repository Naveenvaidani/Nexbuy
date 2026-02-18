(function(){
  // Helper to generate product-relevant placeholder images (with stable seed based on SKU)
  function generateProductPlaceholder(product, size = 300) {
    const categoryMap = {
        'Electronics': 'technology,gadgets',
        'Fashion': 'fashion,clothing',
        'Home & Kitchen': 'kitchen,home',
        'Books': 'books,reading',
        'Sports': 'sports,fitness',
        'Beauty': 'beauty,cosmetics'
    };
    
    const subcategoryMap = {
        'Audio': 'headphones,audio',
        'Smartphones': 'smartphone,mobile',
        'Men\'s Jeans': 'jeans,denim',
        'Men\'s Activewear': 'sportswear,fitness',
        'Kitchen Appliances': 'kitchen,appliances',
        'Smartwatches': 'smartwatch,wearable'
    };
    
    let query = '';
    if (product.subcategory && subcategoryMap[product.subcategory]) {
        query = subcategoryMap[product.subcategory];
    } else if (product.category && categoryMap[product.category]) {
        query = categoryMap[product.category];
    } else if (product.brand) {
        query = encodeURIComponent(product.brand.toLowerCase());
    } else {
        query = 'product,shopping';
    }
    
    // Use SKU as seed to ensure same image for same product
    const seed = product.sku || product._id || Math.random().toString(36).substring(7);
    return `https://source.unsplash.com/${size}x${size}/?${query}&sig=${seed}`;
  }

  function getQueryParam(name){
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  async function fetchProduct(id){
    const sku = id;
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/products/${encodeURIComponent(sku)}`);
      if(!res.ok){
        throw new Error(`API ${res.status}`);
      }
      const data = await res.json();
      return data.product || data;
    } catch(e){
      console.error('Product fetch failed:', e);
      return null;
    }
  }

  function pickImage(p){
    return p.imageUrl || p.imageLarge || p.imageThumb || (p.images && p.images[0] && p.images[0].url) || generateProductPlaceholder(p, 600);
  }

  function renderProduct(p){
    if(!p){
      document.getElementById('productContainer').innerHTML = `<div class='alert alert-danger'>Product not found.</div>`;
      return;
    }
    document.getElementById('productTitle').textContent = p.title || p.name || 'Product';
    document.getElementById('productBrand').textContent = p.brand ? `Brand: ${p.brand}` : '';
    document.getElementById('productImage').src = pickImage(p);
    document.getElementById('productImage').alt = p.title || 'Product';

    const priceBlock = document.getElementById('priceBlock');
    const price = p.priceINR || p.price?.current;
    const discount = p.discountPercent || p.price?.discountPercent;
    priceBlock.innerHTML = `
      ${price ? `<span class='h4 text-success me-2'>${formatINR(price)}</span>` : ''}
      ${discount ? `<span class='badge bg-success'>${discount}% off</span>` : ''}
    `;

    document.getElementById('productDescription').textContent = p.description || '';

    const addBtn = document.getElementById('addToCartBtn');
    addBtn.onclick = async () => {
      try{
        const sku = p.sku || p.productId || p.id;
        if(!sku){
          throw new Error('Missing SKU');
        }
        const r = await api.post('/cart/add', { sku, quantity: 1 });
        if(r && r.success){
          showToast('Added to cart', 'success');
          // update cart count if available
          if(window.updateCartCount){ window.updateCartCount(r.cart?.items?.length); }
        } else {
          showToast(r?.message || 'Failed to add to cart', 'error');
        }
      }catch(err){
        console.error('Add to cart failed', err);
        showToast('Add to cart failed', 'error');
      }
    };
  }

  async function init(){
    const id = getQueryParam('id');
    const product = await fetchProduct(id);
    renderProduct(product);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
