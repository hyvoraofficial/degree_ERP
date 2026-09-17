'use client';

import * as React from 'react';
import { 
  Library, Plus, Search, RefreshCw, BookOpen, UserCheck, ArrowRightLeft, X, CheckCircle2, Bookmark
} from 'lucide-react';
import { libraryService, LibraryBook } from '@/services/library.service';
import { studentService, Student } from '@/services/student.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';

export default function LibraryPage() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = React.useState<'BOOKS' | 'ISSUED'>('BOOKS');
  const [books, setBooks] = React.useState<LibraryBook[]>([]);
  const [issuedLogs, setIssuedLogs] = React.useState<any[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  // Modals
  const [isAddBookModalOpen, setIsAddBookModalOpen] = React.useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = React.useState(false);
  const [selectedBookToIssue, setSelectedBookToIssue] = React.useState<LibraryBook | null>(null);
  const [selectedStudentId, setSelectedStudentId] = React.useState('');
  const [dueDays, setDueDays] = React.useState(14);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Book form fields
  const [title, setTitle] = React.useState('');
  const [author, setAuthor] = React.useState('');
  const [isbn, setIsbn] = React.useState('');
  const [category, setCategory] = React.useState('Computer Science');
  const [totalCopies, setTotalCopies] = React.useState(5);
  const [shelfLocation, setShelfLocation] = React.useState('Stack CS-Row 1');

  const fetchBooks = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await libraryService.findAllBooks(searchQuery);
      setBooks(data);
    } catch (err: any) {
      toast('Failed to load books', err.message || 'Error', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, toast]);

  const fetchIssuedLogs = React.useCallback(async () => {
    try {
      const data = await libraryService.listIssuedBooks();
      setIssuedLogs(data);
    } catch (e) {
      console.error('Failed to load issued logs:', e);
    }
  }, []);

  const fetchStudents = React.useCallback(async () => {
    try {
      const res = await studentService.findAll(undefined, undefined, undefined, 1, 100);
      setStudents(res.students || []);
    } catch (e) {
      console.error('Failed to load students:', e);
    }
  }, []);

  React.useEffect(() => {
    fetchBooks();
    fetchIssuedLogs();
    fetchStudents();
  }, [fetchBooks, fetchIssuedLogs, fetchStudents]);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author) {
      toast('Validation Error', 'Title and Author are required.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await libraryService.createBook({
        title,
        author,
        isbn,
        category,
        totalCopies: Number(totalCopies),
        shelfLocation,
      });
      toast('Success', `Book "${title}" added to library catalog.`, 'success');
      setIsAddBookModalOpen(false);
      fetchBooks();
    } catch (err: any) {
      toast('Error', err.message || 'Failed to add book', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenIssue = (book: LibraryBook) => {
    setSelectedBookToIssue(book);
    setSelectedStudentId('');
    setIsIssueModalOpen(true);
  };

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookToIssue || !selectedStudentId) {
      toast('Required', 'Please select a student.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await libraryService.issueBook(selectedBookToIssue.id, selectedStudentId, dueDays);
      toast('Issued', `Book issued successfully.`, 'success');
      setIsIssueModalOpen(false);
      fetchBooks();
      fetchIssuedLogs();
    } catch (err: any) {
      toast('Issue Failed', err.message || 'Error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnBook = async (issueId: string) => {
    try {
      await libraryService.returnBook(issueId);
      toast('Returned', 'Book returned and checked in.', 'success');
      fetchBooks();
      fetchIssuedLogs();
    } catch (err: any) {
      toast('Return Failed', err.message || 'Error', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Library Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Book catalog, inventory copies, student borrowings, and return tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchBooks} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button 
            onClick={() => setIsAddBookModalOpen(true)} 
            size="sm" 
            className="gap-2 bg-primary text-white"
          >
            <Plus className="w-4 h-4" />
            Add Book
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('BOOKS')}
          className={`px-4 py-2 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
            activeTab === 'BOOKS'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Book Inventory ({books.length})
        </button>
        <button
          onClick={() => setActiveTab('ISSUED')}
          className={`px-4 py-2 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
            activeTab === 'ISSUED'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Issued Books Log ({issuedLogs.length})
        </button>
      </div>

      {activeTab === 'BOOKS' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search books by title, author, category, or ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 shadow-none text-xs p-0 focus-visible:ring-0"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {books.map((b) => (
              <Card key={b.id} className="p-5 border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {b.isbn || 'ISBN-CAT'}
                    </span>
                    <Badge variant={b.availableCopies > 0 ? 'success' : 'outline'} className="text-[10px]">
                      {b.availableCopies} of {b.totalCopies} Available
                    </Badge>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{b.title}</h3>
                  <p className="text-xs font-semibold text-slate-600 mt-1">by {b.author}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{b.category || 'General'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">
                    {b.shelfLocation || 'Main Stack'}
                  </span>
                  <Button
                    onClick={() => handleOpenIssue(b)}
                    disabled={b.availableCopies <= 0}
                    size="sm"
                    variant="outline"
                    className="text-xs font-bold"
                  >
                    Issue Book
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* Issued Books Logs Table */
        <Card className="overflow-hidden border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Book Title</th>
                <th className="p-3.5">Borrower Student</th>
                <th className="p-3.5">Issue Date</th>
                <th className="p-3.5">Due Date</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {issuedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    No books currently issued
                  </td>
                </tr>
              ) : (
                issuedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="p-3.5 font-bold text-slate-900">{log.book?.title}</td>
                    <td className="p-3.5">
                      <span className="font-bold text-slate-800 block">
                        {log.student?.user?.firstName} {log.student?.user?.lastName}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{log.student?.admissionNumber}</span>
                    </td>
                    <td className="p-3.5 text-slate-500">{new Date(log.issueDate).toLocaleDateString()}</td>
                    <td className="p-3.5 text-slate-500">{new Date(log.dueDate).toLocaleDateString()}</td>
                    <td className="p-3.5 text-right">
                      <Button onClick={() => handleReturnBook(log.id)} size="sm" variant="outline" className="text-xs font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                        Mark Returned
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* Add Book Modal */}
      {isAddBookModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">Add Book to Catalog</h3>
              <button onClick={() => setIsAddBookModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBook} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Book Title *</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Author(s) *</label>
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} required className="text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ISBN</label>
                  <Input value={isbn} onChange={(e) => setIsbn(e.target.value)} className="text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Copies</label>
                  <Input type="number" min="1" value={totalCopies} onChange={(e) => setTotalCopies(Number(e.target.value))} className="text-xs font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} className="text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shelf Location</label>
                  <Input value={shelfLocation} onChange={(e) => setShelfLocation(e.target.value)} className="text-xs" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddBookModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="bg-primary text-white">
                  {isSubmitting ? 'Adding...' : 'Add Book'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Book Modal */}
      {isIssueModalOpen && selectedBookToIssue && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">Issue Book to Student</h3>
              <button onClick={() => setIsIssueModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-black text-xs text-slate-900">{selectedBookToIssue.title}</h4>
              <p className="text-[11px] text-slate-500">by {selectedBookToIssue.author} ({selectedBookToIssue.availableCopies} available)</p>
            </div>

            <form onSubmit={handleIssueBook} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Student *</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                  required
                >
                  <option value="">-- Choose Student Borrower --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.user?.firstName} {st.user?.lastName} ({st.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Loan Duration (Days)</label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={dueDays}
                  onChange={(e) => setDueDays(Number(e.target.value))}
                  className="text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsIssueModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="bg-primary text-white">
                  {isSubmitting ? 'Issuing...' : 'Confirm Issue'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
