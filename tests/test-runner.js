#!/usr/bin/env node
/**
 * test-runner.js - CLI Test Framework for spaceSIM
 * Run with: node tests/test-runner.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Test results
const results = {
    passed: 0,
    failed: 0,
    errors: [],
    warnings: []
};

// Log file
const LOG_FILE = path.join(__dirname, '..', 'debug-log.txt');
let logContent = [];

function log(level, message) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${level}] ${message}`;
    logContent.push(entry);

    const colors = {
        INFO: '\x1b[36m',
        PASS: '\x1b[32m',
        FAIL: '\x1b[31m',
        WARN: '\x1b[33m',
        ERROR: '\x1b[31m'
    };
    const reset = '\x1b[0m';
    console.log(`${colors[level] || ''}${entry}${reset}`);
}

function saveLog() {
    const header = [
        '='.repeat(60),
        'SPACESIM TEST LOG',
        `Generated: ${new Date().toISOString()}`,
        `Results: ${results.passed} passed, ${results.failed} failed`,
        '='.repeat(60),
        ''
    ].join('\n');

    fs.writeFileSync(LOG_FILE, header + logContent.join('\n'));
    log('INFO', `Log saved to ${LOG_FILE}`);
}

// =============================================================================
// TEST: Syntax Check
// =============================================================================
function testSyntax(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    try {
        const code = fs.readFileSync(filePath, 'utf8');

        // Try to parse the code
        new vm.Script(code, { filename: filePath });

        log('PASS', `Syntax OK: ${relativePath}`);
        results.passed++;
        return true;
    } catch (error) {
        log('FAIL', `Syntax Error in ${relativePath}: ${error.message}`);
        results.failed++;
        results.errors.push({
            file: relativePath,
            type: 'syntax',
            message: error.message,
            line: error.stack?.match(/:(\d+):/)?.[1] || 'unknown'
        });
        return false;
    }
}

// =============================================================================
// TEST: Check for common issues
// =============================================================================
function testCommonIssues(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    const code = fs.readFileSync(filePath, 'utf8');
    const lines = code.split('\n');
    let issues = [];

    // Check for duplicate class definitions
    const classMatches = code.match(/^class\s+(\w+)/gm);
    if (classMatches) {
        const seen = {};
        classMatches.forEach(match => {
            const name = match.replace('class ', '');
            if (seen[name]) {
                issues.push(`Duplicate class definition: ${name}`);
            }
            seen[name] = true;
        });
    }

    // Check for duplicate window exports
    const exportMatches = code.match(/window\.(\w+)\s*=/g);
    if (exportMatches) {
        const seen = {};
        exportMatches.forEach(match => {
            if (seen[match]) {
                issues.push(`Duplicate window export: ${match}`);
            }
            seen[match] = true;
        });
    }

    // Check for undefined THREE usage without guard
    if (code.includes('new THREE.') && !code.includes("typeof THREE")) {
        if (!code.includes('// THREE check bypassed')) {
            results.warnings.push({
                file: relativePath,
                message: 'Uses THREE without typeof check'
            });
        }
    }

    // Check for console.error that might indicate issues
    const errorLogs = code.match(/console\.error\([^)]+\)/g);
    if (errorLogs && errorLogs.length > 5) {
        results.warnings.push({
            file: relativePath,
            message: `Has ${errorLogs.length} console.error calls - review for proper error handling`
        });
    }

    // Check for orphan code after class closing brace
    const classEndPattern = /^}\s*$/gm;
    let lastClassEnd = -1;
    let match;
    while ((match = classEndPattern.exec(code)) !== null) {
        lastClassEnd = match.index;
    }

    if (lastClassEnd > 0) {
        const afterClass = code.slice(lastClassEnd + 1).trim();
        // Allow window exports and comments
        const cleanedAfter = afterClass
            .replace(/\/\/.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/window\.\w+\s*=\s*\w+;?/g, '')
            .replace(/module\.exports[\s\S]*$/g, '')
            .trim();

        if (cleanedAfter.length > 10 && cleanedAfter.includes('function') || cleanedAfter.includes('constructor')) {
            issues.push('Possible orphan code after class definition');
        }
    }

    if (issues.length > 0) {
        issues.forEach(issue => {
            log('FAIL', `Issue in ${relativePath}: ${issue}`);
            results.errors.push({ file: relativePath, type: 'structure', message: issue });
        });
        results.failed += issues.length;
        return false;
    }

    return true;
}

// =============================================================================
// TEST: Check dependencies
// =============================================================================
function testDependencies(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    const code = fs.readFileSync(filePath, 'utf8');
    const issues = [];

    // Classes that should be defined before use
    const requiredGlobals = ['THREE', 'CONFIG'];
    const optionalGlobals = ['Entity', 'SceneManager', 'AssetManager', 'InputManager', 'AudioManager'];

    // Check if file uses a class it extends
    const extendsMatch = code.match(/class\s+\w+\s+extends\s+(\w+)/);
    if (extendsMatch) {
        const parentClass = extendsMatch[1];
        if (!code.includes(`class ${parentClass}`) && parentClass !== 'Entity') {
            results.warnings.push({
                file: relativePath,
                message: `Extends ${parentClass} - ensure it's loaded first`
            });
        }
    }

    return issues.length === 0;
}

// =============================================================================
// TEST: Check for potential runtime errors
// =============================================================================
function testRuntimeSafety(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    const code = fs.readFileSync(filePath, 'utf8');

    // Check for unsafe property access patterns
    const unsafePatterns = [
        { pattern: /(\w+)\.(\w+)\.(\w+)(?!\s*[?&|])/g, desc: 'Deep property access without null check' },
    ];

    // This is informational only - don't fail
    return true;
}

// =============================================================================
// Main Test Runner
// =============================================================================
function findJsFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'legacy') {
            findJsFiles(fullPath, files);
        } else if (item.endsWith('.js') && !item.includes('.min.')) {
            files.push(fullPath);
        }
    }
    return files;
}

function runTests() {
    log('INFO', '='.repeat(60));
    log('INFO', 'SPACESIM TEST RUNNER');
    log('INFO', '='.repeat(60));
    log('INFO', '');

    const srcDir = path.join(__dirname, '..', 'src');
    const jsFiles = findJsFiles(srcDir);

    log('INFO', `Found ${jsFiles.length} JavaScript files to test`);
    log('INFO', '');

    // Test 1: Syntax Check
    log('INFO', '--- SYNTAX CHECK ---');
    for (const file of jsFiles) {
        testSyntax(file);
    }
    log('INFO', '');

    // Test 2: Common Issues
    log('INFO', '--- STRUCTURAL CHECK ---');
    for (const file of jsFiles) {
        testCommonIssues(file);
    }
    log('INFO', '');

    // Test 3: Dependencies
    log('INFO', '--- DEPENDENCY CHECK ---');
    for (const file of jsFiles) {
        testDependencies(file);
    }
    log('INFO', '');

    // Summary
    log('INFO', '='.repeat(60));
    log('INFO', 'TEST SUMMARY');
    log('INFO', '='.repeat(60));
    log('INFO', `Passed: ${results.passed}`);
    log('INFO', `Failed: ${results.failed}`);
    log('INFO', `Warnings: ${results.warnings.length}`);
    log('INFO', '');

    if (results.errors.length > 0) {
        log('ERROR', '--- ERRORS ---');
        results.errors.forEach((err, i) => {
            log('ERROR', `${i + 1}. [${err.type}] ${err.file}: ${err.message}`);
        });
        log('INFO', '');
    }

    if (results.warnings.length > 0) {
        log('WARN', '--- WARNINGS ---');
        results.warnings.forEach((warn, i) => {
            log('WARN', `${i + 1}. ${warn.file}: ${warn.message}`);
        });
    }

    saveLog();

    // Exit with error code if tests failed
    process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests();
