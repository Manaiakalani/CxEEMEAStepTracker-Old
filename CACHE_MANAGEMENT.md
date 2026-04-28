# Cache Management & Deployment Checklist

## For Fresh Content Delivery

### Before Each Deployment:

1. **Update Cache Version** 🔄
   - [ ] Update `CACHE_VERSION` in `sw.js` with current timestamp (format: YYYY-MM-DD-XXX)
   - [ ] Test service worker registration locally

2. **Clear Browser Caches** 🗑️
   - [ ] Use Admin Dashboard > Cache Management > Clear All Cache
   - [ ] Or use keyboard shortcut: `Ctrl+Shift+R` in app

3. **Version Your Critical Assets** 📦
   - [ ] Consider adding version query parameters to critical files if needed
   - [ ] Example: `script.js?v=2024-09-24-001`

### Cache Strategy Summary:

- **Critical Files** (script.js, styles.css, index.html): Cached for 1 hour
- **Static Assets** (images, fonts): Cached for 24 hours  
- **External Resources** (fonts, CDN): Cached for 7 days
- **API Responses**: Always fetch fresh (network-first)

### User Update Mechanisms:

1. **Automatic Updates** ⚡
   - Service worker checks for updates every 30 minutes
   - Users see update notification banner when new version available

2. **Manual Updates** 🔧
   - Admin can force cache clear via dashboard
   - Users can use `Ctrl+Shift+R` for hard refresh
   - `clearCacheAndReload()` function available globally

3. **Background Updates** 🔄
   - Stale-while-revalidate strategy ensures content freshness
   - Cache timestamps track content age

### Testing Fresh Content:

1. **Development Testing** 🧪
   ```bash
   # Open dev tools > Application > Storage
   # Clear all storage and reload
   ```

2. **Production Testing** ✅
   - [ ] Deploy with new cache version
   - [ ] Test on different browsers/devices
   - [ ] Verify update notifications appear
   - [ ] Check admin dashboard cache status

### Troubleshooting Stale Content:

If users report stale content:

1. **Check Service Worker Status**
   - Admin Dashboard > Cache Management
   - Browser DevTools > Application > Service Workers

2. **Force Update**
   ```javascript
   // Run in browser console
   clearCacheAndReload();
   ```

3. **Manual Cache Clear**
   - Navigate to Admin Dashboard
   - Use Cache Management tools

### Best Practices:

- ✅ Always update `CACHE_VERSION` before deployment
- ✅ Test cache behavior in incognito/private browsing
- ✅ Monitor cache hit rates and user feedback
- ✅ Keep cache TTL reasonable (not too long, not too short)
- ✅ Use network-first strategy for dynamic content
- ✅ Provide clear update notifications to users

### Emergency Cache Clear:

If critical issues arise with cached content:

```javascript
// Emergency cache reset (run in console)
(async () => {
    const caches = await window.caches.keys();
    await Promise.all(caches.map(cache => window.caches.delete(cache)));
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
    location.reload(true);
})();
```

---

**Last Updated:** September 24, 2024  
**Next Review:** Check cache strategy effectiveness monthly